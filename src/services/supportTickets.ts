/**
 * Support Tickets Service
 *
 * Handles support ticket management including creation, updates, assignment,
 * and status tracking.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';

// Types
export interface SupportTicket {
  id: string;
  ticketNumber: string;
  merchantId: string;
  merchantName: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'account' | 'general' | 'urgent';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_merchant' | 'resolved' | 'closed';
  assignedTo?: string;
  assignedToName?: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  tags?: string[];
  attachments?: string[];
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorType: 'admin' | 'merchant';
  message: string;
  isInternal: boolean;
  createdAt: Date;
}

export interface TicketFilters {
  status?: string;
  priority?: string;
  category?: string;
  assignedTo?: string;
  merchantId?: string;
  searchQuery?: string;
}

export interface TicketStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  averageResolutionTime: number; // in hours
}

/**
 * Get all support tickets with filtering
 */
export async function getSupportTickets(
  filters: TicketFilters = {},
  limitCount: number = 50
): Promise<SupportTicket[]> {
  try {
    const constraints: QueryConstraint[] = [];

    // Apply filters
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters.priority) {
      constraints.push(where('priority', '==', filters.priority));
    }
    if (filters.category) {
      constraints.push(where('category', '==', filters.category));
    }
    if (filters.assignedTo) {
      constraints.push(where('assignedTo', '==', filters.assignedTo));
    }
    if (filters.merchantId) {
      constraints.push(where('merchantId', '==', filters.merchantId));
    }

    // Add ordering
    constraints.push(orderBy('createdAt', 'desc'));
    constraints.push(limit(limitCount));

    const q = query(collection(db, COLLECTIONS.SUPPORT_TICKETS), ...constraints);
    const snapshot = await getDocs(q);

    const tickets = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      resolvedAt: doc.data().resolvedAt?.toDate(),
      closedAt: doc.data().closedAt?.toDate(),
    })) as SupportTicket[];

    // Apply search filter (client-side)
    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      return tickets.filter(
        (t) =>
          t.ticketNumber.toLowerCase().includes(searchLower) ||
          t.subject.toLowerCase().includes(searchLower) ||
          t.merchantName.toLowerCase().includes(searchLower)
      );
    }

    return tickets;
  } catch (error) {
    console.error('Error getting support tickets:', error);
    throw new Error('Failed to fetch support tickets');
  }
}

/**
 * Get a single support ticket by ID
 */
export async function getSupportTicketById(ticketId: string): Promise<SupportTicket | null> {
  try {
    const docRef = doc(db, COLLECTIONS.SUPPORT_TICKETS, ticketId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate(),
      updatedAt: docSnap.data().updatedAt?.toDate(),
      resolvedAt: docSnap.data().resolvedAt?.toDate(),
      closedAt: docSnap.data().closedAt?.toDate(),
    } as SupportTicket;
  } catch (error) {
    console.error('Error getting support ticket:', error);
    throw new Error('Failed to fetch support ticket');
  }
}

/**
 * Create a new support ticket
 */
export async function createSupportTicket(
  ticketData: Omit<SupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    // Generate ticket number
    const ticketNumber = `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const docRef = await addDoc(collection(db, COLLECTIONS.SUPPORT_TICKETS), {
      ...ticketData,
      ticketNumber,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating support ticket:', error);
    throw new Error('Failed to create support ticket');
  }
}

/**
 * Update support ticket
 */
export async function updateSupportTicket(
  ticketId: string,
  updates: Partial<SupportTicket>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.SUPPORT_TICKETS, ticketId);

    // Handle date conversions
    const updateData: any = { ...updates };
    if (updates.resolvedAt) {
      updateData.resolvedAt = Timestamp.fromDate(updates.resolvedAt);
    }
    if (updates.closedAt) {
      updateData.closedAt = Timestamp.fromDate(updates.closedAt);
    }

    updateData.updatedAt = Timestamp.now();

    // Remove id from updates
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.ticketNumber;

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating support ticket:', error);
    throw new Error('Failed to update support ticket');
  }
}

/**
 * Assign ticket to admin
 */
export async function assignTicket(
  ticketId: string,
  adminId: string,
  adminName: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.SUPPORT_TICKETS, ticketId);
    await updateDoc(docRef, {
      assignedTo: adminId,
      assignedToName: adminName,
      status: 'in_progress',
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error assigning ticket:', error);
    throw new Error('Failed to assign ticket');
  }
}

/**
 * Update ticket status
 */
export async function updateTicketStatus(
  ticketId: string,
  status: SupportTicket['status']
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.SUPPORT_TICKETS, ticketId);

    const updateData: any = {
      status,
      updatedAt: Timestamp.now(),
    };

    // Add timestamp for status changes
    if (status === 'resolved') {
      updateData.resolvedAt = Timestamp.now();
    } else if (status === 'closed') {
      updateData.closedAt = Timestamp.now();
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating ticket status:', error);
    throw new Error('Failed to update ticket status');
  }
}

/**
 * Update ticket priority
 */
export async function updateTicketPriority(
  ticketId: string,
  priority: SupportTicket['priority']
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.SUPPORT_TICKETS, ticketId);
    await updateDoc(docRef, {
      priority,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating ticket priority:', error);
    throw new Error('Failed to update ticket priority');
  }
}

/**
 * Add comment to ticket
 */
export async function addTicketComment(
  comment: Omit<TicketComment, 'id' | 'createdAt'>
): Promise<string> {
  try {
    const ticketsRef = collection(db, COLLECTIONS.SUPPORT_TICKETS);
    const commentsRef = collection(ticketsRef, comment.ticketId, 'comments');

    const docRef = await addDoc(commentsRef, {
      ...comment,
      createdAt: Timestamp.now(),
    });

    // Update ticket's updatedAt
    const ticketRef = doc(db, COLLECTIONS.SUPPORT_TICKETS, comment.ticketId);
    await updateDoc(ticketRef, {
      updatedAt: Timestamp.now(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error adding ticket comment:', error);
    throw new Error('Failed to add ticket comment');
  }
}

/**
 * Get ticket comments
 */
export async function getTicketComments(ticketId: string): Promise<TicketComment[]> {
  try {
    const ticketsRef = collection(db, COLLECTIONS.SUPPORT_TICKETS);
    const commentsRef = collection(ticketsRef, ticketId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as TicketComment[];
  } catch (error) {
    console.error('Error getting ticket comments:', error);
    throw new Error('Failed to fetch ticket comments');
  }
}

/**
 * Get ticket statistics
 */
export async function getTicketStats(): Promise<TicketStats> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.SUPPORT_TICKETS));

    const stats: TicketStats = {
      totalTickets: snapshot.size,
      openTickets: 0,
      inProgressTickets: 0,
      resolvedTickets: 0,
      closedTickets: 0,
      averageResolutionTime: 0,
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();

      // Count by status
      switch (data.status) {
        case 'open':
          stats.openTickets++;
          break;
        case 'in_progress':
          stats.inProgressTickets++;
          break;
        case 'resolved':
          stats.resolvedTickets++;
          break;
        case 'closed':
          stats.closedTickets++;
          break;
      }

      // Calculate resolution time for resolved tickets
      if (data.resolvedAt && data.createdAt) {
        const resolutionTime =
          (data.resolvedAt.toDate().getTime() - data.createdAt.toDate().getTime()) /
          (1000 * 60 * 60); // Convert to hours
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    });

    // Calculate average resolution time
    if (resolvedCount > 0) {
      stats.averageResolutionTime = Math.round(totalResolutionTime / resolvedCount);
    }

    return stats;
  } catch (error) {
    console.error('Error getting ticket stats:', error);
    throw new Error('Failed to fetch ticket statistics');
  }
}

/**
 * Get tickets by merchant
 */
export async function getTicketsByMerchant(merchantId: string): Promise<SupportTicket[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.SUPPORT_TICKETS),
      where('merchantId', '==', merchantId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      resolvedAt: doc.data().resolvedAt?.toDate(),
      closedAt: doc.data().closedAt?.toDate(),
    })) as SupportTicket[];
  } catch (error) {
    console.error('Error getting tickets by merchant:', error);
    throw new Error('Failed to fetch merchant tickets');
  }
}
