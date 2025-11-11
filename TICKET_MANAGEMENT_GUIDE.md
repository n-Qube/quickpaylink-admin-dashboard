# Ticket Management System - Implementation Guide

Complete guide for implementing and using the Support Ticket Management System for QuickLink Pay Admin Dashboard.

---

## Table of Contents

1. [Overview](#overview)
2. [Role Definitions](#role-definitions)
3. [Features](#features)
4. [Data Model](#data-model)
5. [Frontend Implementation](#frontend-implementation)
6. [Backend Implementation](#backend-implementation)
7. [SLA Configuration](#sla-configuration)
8. [Email Notifications](#email-notifications)
9. [Firestore Security Rules](#firestore-security-rules)
10. [Usage Guide](#usage-guide)
11. [Best Practices](#best-practices)

---

## Overview

The Ticket Management System provides a complete solution for tracking and managing merchant support requests. It includes:

- **Multi-channel ticket creation** (email, phone, chat, dashboard, API)
- **Automated ticket assignment** and routing
- **SLA tracking** and monitoring
- **Internal notes** and merchant communication
- **Satisfaction ratings** and feedback
- **Comprehensive reporting** and analytics
- **Role-based access control** for support team

---

## Role Definitions

### Merchant Support Lead
**Access Level**: `merchant_support_lead`

**Responsibilities**:
- Oversee all merchant support operations
- Assign tickets to support agents
- Escalate complex or high-priority tickets
- Monitor SLA compliance
- Review satisfaction ratings and feedback
- Generate support performance reports
- Manage support team workload

**Permissions**:
- View all tickets
- Create new tickets
- Assign/reassign tickets
- Update ticket status, priority, category
- Send internal and external messages
- Resolve and close tickets
- Escalate tickets
- Generate reports
- View detailed analytics

### Merchant Support Agent
**Access Level**: `merchant_support_agent`

**Responsibilities**:
- Respond to assigned tickets
- Investigate and resolve merchant issues
- Communicate with merchants
- Escalate when necessary
- Document resolution steps
- Maintain SLA compliance

**Permissions**:
- View assigned tickets and unassigned tickets
- Create new tickets
- Update assigned ticket status
- Send messages (internal and external)
- Resolve tickets (within scope)
- Request escalation
- Limited analytics access

---

## Features

### Ticket Management
✅ Create tickets from multiple sources
✅ Automatic ticket numbering (TKT-2024-00001)
✅ Rich ticket details with attachments
✅ Ticket assignment to specific agents or teams
✅ Status tracking (open, assigned, in progress, waiting, resolved, closed)
✅ Priority levels (low, medium, high, urgent, critical)
✅ Category classification (10+ categories)
✅ Related tickets and merging

### Communication
✅ Two-way messaging between admin and merchant
✅ Internal notes (not visible to merchant)
✅ Message threading and conversation history
✅ Attachment support
✅ Email integration (optional)

### SLA Management
✅ Automatic SLA calculation
✅ First response time tracking
✅ Resolution time tracking
✅ SLA breach detection and alerts
✅ Configurable SLA thresholds per priority

### Reporting & Analytics
✅ Ticket statistics dashboard
✅ Performance metrics (resolution time, response time)
✅ SLA compliance rate
✅ Satisfaction scores
✅ Tickets by category, priority, status
✅ Agent performance tracking
✅ Export capabilities

---

## Data Model

### SupportTicket Document Structure

```typescript
{
  ticketId: string;  // Firestore doc ID
  ticketNumber: string;  // Human-readable (TKT-2024-00001)

  merchant: {
    merchantId: string;
    businessName: string;
    email: string;
    phoneNumber?: string;
  };

  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  source: TicketSource;

  assignment: {
    assignedTo?: string;  // Admin ID
    assignedToName?: string;
    assignedAt?: Timestamp;
    assignedBy?: string;
    teamQueue?: string;
  };

  messages: TicketMessage[];  // Conversation history
  activities: TicketActivity[];  // Audit trail
  tags: string[];

  sla: {
    firstResponseTime?: number;  // in minutes
    firstResponseDue: Timestamp;
    firstResponseMetAt?: Timestamp;
    resolutionTime?: number;  // in minutes
    resolutionDue: Timestamp;
    resolutionMetAt?: Timestamp;
    breached: boolean;
    breachReason?: string;
  };

  satisfaction?: {
    rating: 1 | 2 | 3 | 4 | 5;
    feedback?: string;
    ratedAt: Timestamp;
  };

  relatedTickets?: string[];
  mergedInto?: string;

  metadata: {
    browserInfo?: string;
    deviceInfo?: string;
    ipAddress?: string;
    sessionId?: string;
    errorLogs?: string;
  };

  resolution?: {
    resolvedBy: string;
    resolvedByName: string;
    resolvedAt: Timestamp;
    resolutionNotes: string;
    resolutionType: 'solved' | 'workaround' | 'duplicate' | 'not_reproducible' | 'wont_fix';
  };

  escalation?: {
    escalated: boolean;
    escalatedTo?: string;
    escalatedBy?: string;
    escalatedAt?: Timestamp;
    escalationReason?: string;
    escalationLevel: number;
  };

  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
  closedAt?: Timestamp;
  closedBy?: string;
  reopenedCount: number;
  lastReopenedAt?: Timestamp;
}
```

---

## Frontend Implementation

The Support Tickets page is already implemented in `src/pages/SupportTickets.tsx` with:

### Key Features
- **Dashboard view** with ticket statistics
- **Advanced filtering** (status, priority, category, assignment)
- **Search functionality** across tickets
- **Detailed ticket view modal** with full conversation history
- **Quick actions** (assign, change status, send message)
- **Real-time updates**

### Usage in Other Components

To integrate ticket stats into merchant details page:

```typescript
// Example: Add ticket count to merchant card
import { collection, query, where, getCountFromServer } from 'firebase/firestore';

const getMerchantTicketCount = async (merchantId: string) => {
  const ticketsRef = collection(db, 'supportTickets');
  const q = query(ticketsRef, where('merchant.merchantId', '==', merchantId));
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
};

// Get open tickets for a merchant
const getOpenTicketsCount = async (merchantId: string) => {
  const ticketsRef = collection(db, 'supportTickets');
  const q = query(
    ticketsRef,
    where('merchant.merchantId', '==', merchantId),
    where('status', 'in', ['open', 'assigned', 'in_progress'])
  );
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
};
```

---

## Backend Implementation

### Cloud Functions

Create these Firebase Cloud Functions for automated ticket management:

#### 1. Generate Ticket Number
```typescript
// functions/src/services/ticket.service.ts

import * as admin from 'firebase-admin';

export class TicketService {
  private db = admin.firestore();

  /**
   * Generate next ticket number (TKT-YYYY-NNNNN)
   */
  async generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const counterRef = this.db.collection('counters').doc('ticketCounter');

    const result = await this.db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      let nextNumber = 1;
      if (counterDoc.exists) {
        const data = counterDoc.data()!;
        if (data.year === year) {
          nextNumber = data.counter + 1;
        }
      }

      transaction.set(counterRef, {
        year,
        counter: nextNumber,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return `TKT-${year}-${String(nextNumber).padStart(5, '0')}`;
    });

    return result;
  }

  /**
   * Calculate SLA deadlines based on priority
   */
  calculateSLA(priority: string, createdAt: admin.firestore.Timestamp) {
    // SLA targets (in minutes)
    const slaTargets: Record<string, { firstResponse: number; resolution: number }> = {
      critical: { firstResponse: 15, resolution: 120 },      // 15min, 2hr
      urgent: { firstResponse: 30, resolution: 240 },        // 30min, 4hr
      high: { firstResponse: 60, resolution: 480 },          // 1hr, 8hr
      medium: { firstResponse: 240, resolution: 1440 },      // 4hr, 24hr
      low: { firstResponse: 480, resolution: 2880 },         // 8hr, 48hr
    };

    const target = slaTargets[priority] || slaTargets.medium;
    const createdDate = createdAt.toDate();

    return {
      firstResponseDue: admin.firestore.Timestamp.fromDate(
        new Date(createdDate.getTime() + target.firstResponse * 60 * 1000)
      ),
      resolutionDue: admin.firestore.Timestamp.fromDate(
        new Date(createdDate.getTime() + target.resolution * 60 * 1000)
      ),
      breached: false,
    };
  }

  /**
   * Auto-assign ticket based on workload
   */
  async autoAssignTicket(category: string, priority: string): Promise<{ adminId: string; displayName: string } | null> {
    // Get support agents
    const adminsRef = this.db.collection('admins');
    const agentsQuery = adminsRef.where('accessLevel', 'in', ['merchant_support_agent', 'merchant_support_lead']);
    const agentsSnap = await agentsQuery.get();

    if (agentsSnap.empty) return null;

    // Get current ticket counts for each agent
    const agentWorkloads: Array<{ adminId: string; displayName: string; openTickets: number }> = [];

    for (const agentDoc of agentsSnap.docs) {
      const agent = agentDoc.data();
      const ticketsQuery = this.db.collection('supportTickets')
        .where('assignment.assignedTo', '==', agentDoc.id)
        .where('status', 'in', ['open', 'assigned', 'in_progress']);

      const ticketsSnap = await ticketsQuery.get();

      agentWorkloads.push({
        adminId: agentDoc.id,
        displayName: agent.profile.displayName,
        openTickets: ticketsSnap.size,
      });
    }

    // Sort by workload (least busy first)
    agentWorkloads.sort((a, b) => a.openTickets - b.openTickets);

    // Return agent with lowest workload
    return agentWorkloads.length > 0 ? {
      adminId: agentWorkloads[0].adminId,
      displayName: agentWorkloads[0].displayName,
    } : null;
  }
}
```

#### 2. Create Ticket Cloud Function
```typescript
// functions/src/index.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { TicketService } from './services/ticket.service';

export const createTicket = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const {
    merchantId,
    subject,
    description,
    category,
    priority = 'medium',
    source = 'dashboard',
    metadata = {},
  } = data;

  // Validate input
  if (!merchantId || !subject || !description) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  const db = admin.firestore();
  const ticketService = new TicketService();

  try {
    // Get merchant info
    const merchantDoc = await db.collection('merchants').doc(merchantId).get();
    if (!merchantDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Merchant not found');
    }

    const merchant = merchantDoc.data()!;

    // Generate ticket number
    const ticketNumber = await ticketService.generateTicketNumber();

    // Calculate SLA
    const createdAt = admin.firestore.Timestamp.now();
    const sla = ticketService.calculateSLA(priority, createdAt);

    // Auto-assign (optional)
    const assignedAgent = await ticketService.autoAssignTicket(category, priority);

    // Create ticket
    const ticketData = {
      ticketNumber,
      merchant: {
        merchantId: merchantDoc.id,
        businessName: merchant.businessInfo.businessName,
        email: merchant.businessInfo.email,
        phoneNumber: merchant.businessInfo.phoneNumber,
      },
      subject,
      description,
      category,
      priority,
      status: assignedAgent ? 'assigned' : 'open',
      source,
      assignment: assignedAgent ? {
        assignedTo: assignedAgent.adminId,
        assignedToName: assignedAgent.displayName,
        assignedAt: createdAt,
        assignedBy: 'auto-assign',
      } : {},
      messages: [],
      activities: [{
        activityId: `act_${Date.now()}`,
        type: 'status_change',
        performedBy: {
          adminId: context.auth.uid,
          displayName: 'System',
        },
        description: 'Ticket created',
        newValue: assignedAgent ? 'assigned' : 'open',
        timestamp: createdAt,
      }],
      tags: [],
      sla,
      metadata,
      escalation: {
        escalated: false,
        escalationLevel: 0,
      },
      createdAt,
      createdBy: context.auth.uid,
      updatedAt: createdAt,
      updatedBy: context.auth.uid,
      reopenedCount: 0,
    };

    const ticketRef = await db.collection('supportTickets').add(ticketData);

    // Update merchant ticket count
    await db.collection('merchants').doc(merchantId).update({
      'adminMetadata.supportTicketsCount': admin.firestore.FieldValue.increment(1),
      'adminMetadata.lastSupportInteraction': createdAt,
    });

    return {
      success: true,
      ticketId: ticketRef.id,
      ticketNumber,
    };
  } catch (error: any) {
    console.error('Error creating ticket:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

#### 3. SLA Monitoring Function
```typescript
// functions/src/index.ts

export const monitorSLABreaches = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    // Find tickets with breached SLA
    const ticketsRef = db.collection('supportTickets');
    const query = ticketsRef
      .where('status', 'in', ['open', 'assigned', 'in_progress'])
      .where('sla.breached', '==', false);

    const snapshot = await query.get();

    for (const doc of snapshot.docs) {
      const ticket = doc.data();
      const sla = ticket.sla;

      let breached = false;
      let breachReason = '';

      // Check first response breach
      if (!sla.firstResponseMetAt && now.seconds > sla.firstResponseDue.seconds) {
        breached = true;
        breachReason = 'First response SLA breached';
      }

      // Check resolution breach
      if (!ticket.resolution && now.seconds > sla.resolutionDue.seconds) {
        breached = true;
        breachReason = breachReason ? `${breachReason}; Resolution SLA breached` : 'Resolution SLA breached';
      }

      if (breached) {
        await doc.ref.update({
          'sla.breached': true,
          'sla.breachReason': breachReason,
          updatedAt: now,
          updatedBy: 'system',
        });

        // Create alert
        await db.collection('alerts').add({
          title: 'SLA Breach',
          message: `Ticket ${ticket.ticketNumber} has breached SLA: ${breachReason}`,
          type: 'other',
          severity: ticket.priority === 'critical' || ticket.priority === 'urgent' ? 'high' : 'medium',
          priority: 'P2',
          source: {
            system: 'ticket_system',
            component: 'sla_monitor',
          },
          status: 'triggered',
          triggeredAt: now,
          updatedAt: now,
          autoResolve: false,
        });
      }
    }

    console.log(`Processed ${snapshot.size} tickets for SLA monitoring`);
  });
```

---

## SLA Configuration

### Default SLA Targets

| Priority | First Response | Resolution |
|----------|----------------|------------|
| Critical | 15 minutes | 2 hours |
| Urgent | 30 minutes | 4 hours |
| High | 1 hour | 8 hours |
| Medium | 4 hours | 24 hours |
| Low | 8 hours | 48 hours |

### Customizing SLA Targets

Update the `calculateSLA` method in `TicketService` to adjust targets based on your requirements.

---

## Email Notifications

### Set Up Email Triggers

```typescript
// functions/src/index.ts

export const sendTicketNotifications = functions.firestore
  .document('supportTickets/{ticketId}')
  .onCreate(async (snapshot, context) => {
    const ticket = snapshot.data();

    // Send email to merchant
    await admin.firestore().collection('mail').add({
      to: ticket.merchant.email,
      template: {
        name: 'ticket-created',
        data: {
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          merchantName: ticket.merchant.businessName,
        },
      },
    });

    // Send email to assigned agent
    if (ticket.assignment.assignedTo) {
      const adminDoc = await admin.firestore().collection('admins').doc(ticket.assignment.assignedTo).get();
      const admin Data = adminDoc.data();

      if (adminData?.email) {
        await admin.firestore().collection('mail').add({
          to: adminData.email,
          template: {
            name: 'ticket-assigned',
            data: {
              ticketNumber: ticket.ticketNumber,
              subject: ticket.subject,
              merchantName: ticket.merchant.businessName,
              priority: ticket.priority,
            },
          },
        });
      }
    }
  });
```

---

## Firestore Security Rules

```javascript
// firestore.rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Support Tickets
    match /supportTickets/{ticketId} {
      // Allow read for support staff
      allow read: if request.auth != null &&
                     (get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.accessLevel in
                     ['super_admin', 'merchant_support_lead', 'merchant_support_agent']);

      // Allow create for support staff
      allow create: if request.auth != null &&
                       (get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.accessLevel in
                       ['super_admin', 'merchant_support_lead', 'merchant_support_agent']);

      // Allow update for support staff
      allow update: if request.auth != null &&
                       (get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.accessLevel in
                       ['super_admin', 'merchant_support_lead', 'merchant_support_agent']);

      // Super admin and lead can delete
      allow delete: if request.auth != null &&
                       (get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.accessLevel in
                       ['super_admin', 'merchant_support_lead']);
    }

    // Ticket counters
    match /counters/{counterId} {
      allow read: if request.auth != null;
      allow write: if false;  // Only writable by Cloud Functions
    }
  }
}
```

---

## Usage Guide

### For Merchant Support Lead

**1. View All Tickets**
- Navigate to "Support Tickets" from sidebar
- Use filters to find specific tickets
- Monitor SLA compliance

**2. Assign Tickets**
- Open ticket details
- Select agent from "Assigned To" dropdown
- Status automatically updates to "assigned"

**3. Monitor Performance**
- Review ticket statistics dashboard
- Check average resolution time
- Monitor SLA compliance rate
- Review satisfaction scores

**4. Generate Reports**
- Use filters to create custom views
- Export ticket data (future feature)

### For Merchant Support Agent

**1. View Assigned Tickets**
- Use "Assigned to Me" filter
- See all open tickets requiring attention

**2. Respond to Tickets**
- Click ticket to open details
- Add reply in message box
- Choose internal note or merchant-visible

**3. Update Ticket Status**
- Change status as you work (in progress, waiting merchant, etc.)
- Add resolution notes when closing

**4. Escalate if Needed**
- Contact Merchant Support Lead
- Provide escalation reason

---

## Best Practices

### For Support Team

1. **First Response**
   - Acknowledge tickets within SLA targets
   - Set expectations for resolution time
   - Ask clarifying questions early

2. **Status Updates**
   - Keep ticket status current
   - Update merchants on progress
   - Use "waiting_merchant" when blocked

3. **Documentation**
   - Add detailed resolution notes
   - Document workarounds
   - Link related tickets

4. **Internal Notes**
   - Use for team communication
   - Document investigation steps
   - Share insights

5. **Closing Tickets**
   - Confirm issue is resolved
   - Request merchant confirmation
   - Add resolution type

### System Configuration

1. **SLA Targets**
   - Adjust based on team capacity
   - Consider business hours
   - Monitor breach rates

2. **Auto-Assignment**
   - Balance workload evenly
   - Consider agent expertise
   - Allow manual reassignment

3. **Notifications**
   - Don't over-notify
   - Use digest emails for low priority
   - Allow notification preferences

4. **Categories**
   - Keep categories clear and distinct
   - Review and update regularly
   - Train team on proper categorization

---

## Next Steps

1. **Deploy Cloud Functions**
   - Set up `createTicket` function
   - Configure SLA monitoring
   - Set up email notifications

2. **Configure Permissions**
   - Create Merchant Support roles in Firestore
   - Assign permissions
   - Update security rules

3. **Train Team**
   - Walkthrough ticket system
   - Define escalation procedures
   - Establish SLA targets

4. **Monitor & Optimize**
   - Track key metrics
   - Gather team feedback
   - Adjust workflows as needed

---

## Support

For technical assistance or questions about the ticket system:
- Review this guide
- Check Cloud Function logs
- Review Firestore data structure
- Test in development environment first

---

**Version**: 1.0
**Last Updated**: 2025-01-07
**Maintained By**: Platform Operations Team
