/**
 * Support Tickets Management Page
 *
 * Comprehensive ticket management system for Merchant Support Lead and Merchant Support Agent roles.
 * Features include ticket creation, assignment, status tracking, messaging, SLA monitoring, and reporting.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import type {
  SupportTicket,
  TicketStats,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  Merchant,
  Admin,
} from '@/types/database';
import { getMerchants } from '@/services/merchants';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  User,
  Calendar,
  MessageSquare,
  Tag,
  TrendingUp,
  AlertTriangle,
  Send,
  Paperclip,
  Eye,
  Edit,
  Trash2,
  Users,
  BarChart3,
  Download,
  LifeBuoy,
  Building2,
  FileText,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ============================================================================
// Component
// ============================================================================

export default function SupportTickets() {
  const { admin } = useAuth();

  // State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TicketStats>({
    totalTickets: 0,
    openTickets: 0,
    assignedTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    averageResolutionTime: 0,
    averageFirstResponseTime: 0,
    slaComplianceRate: 0,
    satisfactionScore: 0,
    ticketsByPriority: { low: 0, medium: 0, high: 0, urgent: 0, critical: 0 },
    ticketsByCategory: {
      technical_issue: 0,
      billing_payment: 0,
      account_access: 0,
      feature_request: 0,
      integration_support: 0,
      api_issue: 0,
      payout_settlement: 0,
      compliance_kyc: 0,
      general_inquiry: 0,
      other: 0,
    },
    ticketsByStatus: {
      open: 0,
      assigned: 0,
      in_progress: 0,
      waiting_merchant: 0,
      waiting_internal: 0,
      resolved: 0,
      closed: 0,
      reopened: 0,
    },
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');
  const [assignedFilter, setAssignedFilter] = useState<'all' | 'me' | 'unassigned'>('all');

  // UI State
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  // ============================================================================
  // Data Loading
  // ============================================================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load tickets
      try {
        const ticketsRef = collection(db, 'supportTickets');
        let ticketsQuery = query(ticketsRef, orderBy('createdAt', 'desc'), limit(100));

        const ticketsSnap = await getDocs(ticketsQuery);
        const ticketsData = ticketsSnap.docs.map((doc) => ({
          ...doc.data(),
          ticketId: doc.id,
        })) as SupportTicket[];

        setTickets(ticketsData);
        setFilteredTickets(ticketsData);

        // Calculate stats
        calculateStats(ticketsData);
      } catch (ticketError) {
        console.warn('Could not load tickets:', ticketError);
        // Continue loading other data even if tickets fail
      }

      // Load merchants using the service (same as Merchants page)
      try {
        const { merchants: merchantsData } = await getMerchants({}, 100);

        // Transform to match expected Merchant type
        const transformedMerchants = merchantsData.map((m: any) => ({
          merchantId: m.id,
          businessInfo: {
            businessName: m.businessName || m.tradingName || '',
            email: m.contactInfo?.email || m.email || '',
            phoneNumber: m.contactInfo?.phone || m.phoneNumber || '',
            businessType: m.businessType || '',
          },
          status: m.status,
        })) as Merchant[];

        console.log('✅ Loaded merchants from database:', transformedMerchants.length);
        setMerchants(transformedMerchants);
      } catch (merchantError: any) {
        console.error('❌ Error loading merchants:', merchantError);

        // Fallback: try direct query as backup
        try {
          const merchantsRef = collection(db, 'merchants');
          const merchantsSnap = await getDocs(merchantsRef);
          const merchantsData = merchantsSnap.docs.map((doc) => ({
            ...doc.data(),
            merchantId: doc.id,
          })) as Merchant[];

          console.log('✅ Loaded merchants via fallback:', merchantsData.length);
          setMerchants(merchantsData);
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
          setMerchants([]);
        }
      }

      // Load admins for assignment
      try {
        const adminsRef = collection(db, 'admins');
        const adminsSnap = await getDocs(adminsRef);
        const adminsData = adminsSnap.docs.map((doc) => ({
          ...doc.data(),
          adminId: doc.id,
        })) as Admin[];
        setAdmins(adminsData);
      } catch (adminError) {
        console.warn('Could not load admins:', adminError);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ticketsData: SupportTicket[]) => {
    const stats: TicketStats = {
      totalTickets: ticketsData.length,
      openTickets: ticketsData.filter((t) => t.status === 'open').length,
      assignedTickets: ticketsData.filter((t) => t.status === 'assigned').length,
      resolvedTickets: ticketsData.filter((t) => t.status === 'resolved').length,
      closedTickets: ticketsData.filter((t) => t.status === 'closed').length,
      averageResolutionTime: 0,
      averageFirstResponseTime: 0,
      slaComplianceRate: 0,
      satisfactionScore: 0,
      ticketsByPriority: { low: 0, medium: 0, high: 0, urgent: 0, critical: 0 },
      ticketsByCategory: {
        technical_issue: 0,
        billing_payment: 0,
        account_access: 0,
        feature_request: 0,
        integration_support: 0,
        api_issue: 0,
        payout_settlement: 0,
        compliance_kyc: 0,
        general_inquiry: 0,
        other: 0,
      },
      ticketsByStatus: {
        open: 0,
        assigned: 0,
        in_progress: 0,
        waiting_merchant: 0,
        waiting_internal: 0,
        resolved: 0,
        closed: 0,
        reopened: 0,
      },
    };

    // Calculate averages
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let totalFirstResponseTime = 0;
    let respondedCount = 0;
    let slaMetCount = 0;
    let totalSatisfactionRating = 0;
    let ratedCount = 0;

    ticketsData.forEach((ticket) => {
      // Priority counts
      stats.ticketsByPriority[ticket.priority]++;

      // Category counts
      stats.ticketsByCategory[ticket.category]++;

      // Status counts
      stats.ticketsByStatus[ticket.status]++;

      // Resolution time
      if (ticket.resolution?.resolvedAt && ticket.sla.resolutionTime) {
        totalResolutionTime += ticket.sla.resolutionTime;
        resolvedCount++;
      }

      // First response time
      if (ticket.sla.firstResponseTime) {
        totalFirstResponseTime += ticket.sla.firstResponseTime;
        respondedCount++;
      }

      // SLA compliance
      if (!ticket.sla.breached) {
        slaMetCount++;
      }

      // Satisfaction
      if (ticket.satisfaction?.rating) {
        totalSatisfactionRating += ticket.satisfaction.rating;
        ratedCount++;
      }
    });

    stats.averageResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount / 60 : 0;
    stats.averageFirstResponseTime =
      respondedCount > 0 ? totalFirstResponseTime / respondedCount / 60 : 0;
    stats.slaComplianceRate =
      ticketsData.length > 0 ? (slaMetCount / ticketsData.length) * 100 : 0;
    stats.satisfactionScore = ratedCount > 0 ? totalSatisfactionRating / ratedCount : 0;

    setStats(stats);
  };

  // ============================================================================
  // Filtering
  // ============================================================================

  useEffect(() => {
    applyFilters();
  }, [searchQuery, statusFilter, priorityFilter, categoryFilter, assignedFilter, tickets]);

  const applyFilters = () => {
    let filtered = [...tickets];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.ticketNumber.toLowerCase().includes(query) ||
          ticket.subject.toLowerCase().includes(query) ||
          ticket.merchant.businessName.toLowerCase().includes(query) ||
          ticket.description.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((ticket) => ticket.priority === priorityFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((ticket) => ticket.category === categoryFilter);
    }

    // Assignment filter
    if (assignedFilter === 'me' && admin) {
      filtered = filtered.filter((ticket) => ticket.assignment.assignedTo === admin.adminId);
    } else if (assignedFilter === 'unassigned') {
      filtered = filtered.filter((ticket) => !ticket.assignment.assignedTo);
    }

    setFilteredTickets(filtered);
  };

  // ============================================================================
  // Ticket Actions
  // ============================================================================

  const handleAssignTicket = async (ticketId: string, assignToAdminId: string) => {
    try {
      const assignedAdmin = admins.find((a) => a.adminId === assignToAdminId);
      if (!assignedAdmin) return;

      const ticketRef = doc(db, 'supportTickets', ticketId);
      await updateDoc(ticketRef, {
        'assignment.assignedTo': assignToAdminId,
        'assignment.assignedToName': assignedAdmin.profile.displayName,
        'assignment.assignedAt': serverTimestamp(),
        'assignment.assignedBy': admin?.adminId,
        status: 'assigned',
        updatedAt: serverTimestamp(),
        updatedBy: admin?.adminId || 'system',
      });

      await loadData();
    } catch (error) {
      console.error('Error assigning ticket:', error);
      alert('Failed to assign ticket');
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      const ticketRef = doc(db, 'supportTickets', ticketId);
      await updateDoc(ticketRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: admin?.adminId || 'system',
      });

      await loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      const message = {
        messageId: `msg_${Date.now()}`,
        sender: {
          type: 'admin' as const,
          id: admin?.adminId || '',
          name: admin?.profile.displayName || 'Admin',
          email: admin?.email,
        },
        content: newMessage,
        isInternal: isInternalNote,
        timestamp: Timestamp.now(),
      };

      const ticketRef = doc(db, 'supportTickets', selectedTicket.ticketId);
      await updateDoc(ticketRef, {
        messages: [...selectedTicket.messages, message],
        updatedAt: serverTimestamp(),
        updatedBy: admin?.adminId || 'system',
      });

      setNewMessage('');
      setIsInternalNote(false);
      await loadData();

      // Refresh selected ticket
      const updatedTicketSnap = await getDoc(ticketRef);
      if (updatedTicketSnap.exists()) {
        setSelectedTicket({
          ...updatedTicketSnap.data(),
          ticketId: updatedTicketSnap.id,
        } as SupportTicket);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const getPriorityColor = (priority: TicketPriority): string => {
    const colors: Record<TicketPriority, string> = {
      low: 'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800',
      medium: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
      high: 'text-orange-700 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
      urgent: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
      critical: 'text-red-900 bg-red-200 dark:text-red-300 dark:bg-red-900/50',
    };
    return colors[priority];
  };

  const getStatusColor = (status: TicketStatus): string => {
    const colors: Record<TicketStatus, string> = {
      open: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
      assigned: 'text-purple-700 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
      in_progress: 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
      waiting_merchant:
        'text-orange-700 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
      waiting_internal:
        'text-slate-700 bg-slate-100 dark:text-slate-400 dark:bg-slate-800',
      resolved: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
      closed: 'text-slate-600 bg-slate-100 dark:text-slate-500 dark:bg-slate-800',
      reopened: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
    };
    return colors[status];
  };

  const formatStatus = (status: TicketStatus): string => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatPriority = (priority: TicketPriority): string => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const formatCategory = (category: TicketCategory): string => {
    return category
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatTimestamp = (timestamp: Timestamp): string => {
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground mt-1">
            Manage merchant support requests and inquiries
          </p>
        </div>
        <button
          onClick={() => setShowCreateTicket(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Tickets"
          value={stats.totalTickets}
          icon={MessageSquare}
          color="blue"
        />
        <StatCard
          label="Open"
          value={stats.openTickets}
          icon={AlertCircle}
          color="orange"
        />
        <StatCard
          label="In Progress"
          value={stats.assignedTickets}
          icon={Clock}
          color="purple"
        />
        <StatCard
          label="Resolved"
          value={stats.resolvedTickets}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          label="Avg Resolution"
          value={`${stats.averageResolutionTime.toFixed(1)}h`}
          icon={TrendingUp}
          color="blue"
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_merchant">Waiting Merchant</option>
            <option value="waiting_internal">Waiting Internal</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | 'all')}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as TicketCategory | 'all')}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            <option value="technical_issue">Technical Issue</option>
            <option value="billing_payment">Billing/Payment</option>
            <option value="account_access">Account Access</option>
            <option value="feature_request">Feature Request</option>
            <option value="integration_support">Integration Support</option>
            <option value="api_issue">API Issue</option>
            <option value="payout_settlement">Payout/Settlement</option>
            <option value="compliance_kyc">Compliance/KYC</option>
            <option value="general_inquiry">General Inquiry</option>
          </select>

          {/* Assignment Filter */}
          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value as 'all' | 'me' | 'unassigned')}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Tickets</option>
            <option value="me">Assigned to Me</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Merchant
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  SLA
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                    No tickets found matching your filters
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.ticketId}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setShowTicketDetails(true);
                    }}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-sm">{ticket.ticketNumber}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {ticket.subject}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{ticket.merchant.businessName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{formatCategory(ticket.category)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'px-2 py-1 text-xs font-medium rounded-full',
                          getPriorityColor(ticket.priority)
                        )}
                      >
                        {formatPriority(ticket.priority)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'px-2 py-1 text-xs font-medium rounded-full',
                          getStatusColor(ticket.status)
                        )}
                      >
                        {formatStatus(ticket.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {ticket.assignment.assignedToName || (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-muted-foreground">
                        {formatTimestamp(ticket.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {ticket.sla.breached ? (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTicket(ticket);
                          setShowTicketDetails(true);
                        }}
                        className="text-slate-600 dark:text-slate-400 hover:text-primary"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details Modal */}
      {showTicketDetails && selectedTicket && (
        <TicketDetailsModal
          ticket={selectedTicket}
          admins={admins}
          onClose={() => {
            setShowTicketDetails(false);
            setSelectedTicket(null);
          }}
          onAssign={handleAssignTicket}
          onUpdateStatus={handleUpdateStatus}
          onSendMessage={handleSendMessage}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          isInternalNote={isInternalNote}
          setIsInternalNote={setIsInternalNote}
        />
      )}

      {/* Create Ticket Modal */}
      {showCreateTicket && (
        <CreateTicketModal
          merchants={merchants}
          onClose={() => setShowCreateTicket(false)}
          onSuccess={() => {
            setShowCreateTicket(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'orange' | 'purple';
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  const colors = {
    blue: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
    green: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
    orange: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
    purple: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={cn('p-3 rounded-lg', colors[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

interface TicketDetailsModalProps {
  ticket: SupportTicket;
  admins: Admin[];
  onClose: () => void;
  onAssign: (ticketId: string, adminId: string) => void;
  onUpdateStatus: (ticketId: string, status: TicketStatus) => void;
  onSendMessage: () => void;
  newMessage: string;
  setNewMessage: (message: string) => void;
  isInternalNote: boolean;
  setIsInternalNote: (value: boolean) => void;
}

function TicketDetailsModal({
  ticket,
  admins,
  onClose,
  onAssign,
  onUpdateStatus,
  onSendMessage,
  newMessage,
  setNewMessage,
  isInternalNote,
  setIsInternalNote,
}: TicketDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{ticket.ticketNumber}</h2>
            <p className="text-sm text-muted-foreground mt-1">{ticket.subject}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Ticket Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Merchant</label>
              <p className="text-sm mt-1">{ticket.merchant.businessName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <select
                value={ticket.status}
                onChange={(e) => onUpdateStatus(ticket.ticketId, e.target.value as TicketStatus)}
                className="mt-1 px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-transparent"
              >
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_merchant">Waiting Merchant</option>
                <option value="waiting_internal">Waiting Internal</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Priority</label>
              <p className="text-sm mt-1 capitalize">{ticket.priority}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Category</label>
              <p className="text-sm mt-1">{ticket.category.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Assigned To</label>
              <select
                value={ticket.assignment.assignedTo || ''}
                onChange={(e) => onAssign(ticket.ticketId, e.target.value)}
                className="mt-1 px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-transparent w-full"
              >
                <option value="">Unassigned</option>
                {admins.map((admin) => (
                  <option key={admin.adminId} value={admin.adminId}>
                    {admin.profile.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-sm mt-1">{ticket.createdAt.toDate().toLocaleString()}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <p className="text-sm mt-2 text-slate-700 dark:text-slate-300">
              {ticket.description}
            </p>
          </div>

          {/* Messages */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Conversation ({ticket.messages.length})
            </label>
            <div className="space-y-3 bg-slate-50 dark:bg-slate-900 rounded-lg p-4 max-h-96 overflow-y-auto">
              {ticket.messages.map((message) => (
                <div
                  key={message.messageId}
                  className={cn(
                    'p-3 rounded-lg',
                    message.sender.type === 'admin'
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : 'bg-white dark:bg-slate-800'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{message.sender.name}</span>
                      {message.isInternal && (
                        <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded">
                          Internal
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toDate().toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{message.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reply Form */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Add Reply
            </label>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your response..."
              rows={4}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Internal note (not visible to merchant)
              </label>
              <button
                onClick={onSendMessage}
                disabled={!newMessage.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                Send Reply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Create Ticket Modal
// ============================================================================

interface CreateTicketModalProps {
  merchants: Merchant[];
  onClose: () => void;
  onSuccess: () => void;
}

function CreateTicketModal({ merchants, onClose, onSuccess }: CreateTicketModalProps) {
  const { admin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    merchantId: '',
    subject: '',
    description: '',
    category: 'general_inquiry' as TicketCategory,
    priority: 'medium' as TicketPriority,
  });

  // Helper function to get SLA targets based on priority
  const getSLATarget = (priority: TicketPriority, type: 'firstResponse' | 'resolution'): number => {
    const targets = {
      critical: { firstResponse: 15, resolution: 120 },
      urgent: { firstResponse: 30, resolution: 240 },
      high: { firstResponse: 60, resolution: 480 },
      medium: { firstResponse: 240, resolution: 1440 },
      low: { firstResponse: 480, resolution: 2880 },
    };
    return targets[priority][type];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin) return;

    try {
      setLoading(true);
      setError('');

      // Find selected merchant
      const merchant = merchants.find((m) => m.merchantId === formData.merchantId);
      if (!merchant) {
        setError('Please select a merchant');
        return;
      }

      // Generate ticket number (simple implementation - in production use cloud function)
      const ticketNumber = `TKT-${Date.now().toString().slice(-8)}`;

      // Create ticket data
      const ticketData = {
        ticketNumber,
        merchant: {
          merchantId: merchant.merchantId,
          businessName: merchant.businessInfo.businessName,
          email: merchant.businessInfo.email,
          phoneNumber: merchant.businessInfo.phoneNumber,
        },
        subject: formData.subject,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: 'open' as TicketStatus,
        source: 'dashboard' as const,
        assignment: {
          assignedTo: null,
          assignedBy: null,
          assignedAt: null,
        },
        messages: [],
        activities: [
          {
            timestamp: Timestamp.now(),
            action: 'ticket_created',
            performedBy: {
              adminId: admin.adminId,
              name: admin.profile.displayName,
            },
            details: 'Ticket created via admin dashboard',
          },
        ],
        tags: [],
        sla: {
          firstResponseTime: {
            targetMinutes: getSLATarget(formData.priority, 'firstResponse'),
            actualMinutes: null,
            breached: false,
          },
          resolutionTime: {
            targetMinutes: getSLATarget(formData.priority, 'resolution'),
            actualMinutes: null,
            breached: false,
          },
        },
        createdAt: serverTimestamp(),
        createdBy: {
          adminId: admin.adminId,
          name: admin.profile.displayName,
        },
        updatedAt: serverTimestamp(),
        updatedBy: {
          adminId: admin.adminId,
          name: admin.profile.displayName,
        },
      };

      // Save to Firestore
      await addDoc(collection(db, 'supportTickets'), ticketData);

      onSuccess();
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      setError(err.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const maxDescriptionLength = 1000;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <LifeBuoy className="h-5 w-5" />
                  Create New Ticket
                </CardTitle>
                <CardDescription>
                  Report an issue or request support for a merchant
                </CardDescription>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Merchant Selection */}
              <div className="space-y-2">
                <Label htmlFor="merchant" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Merchant <span className="text-red-500">*</span>
                </Label>
                <select
                  id="merchant"
                  required
                  value={formData.merchantId}
                  onChange={(e) => setFormData({ ...formData, merchantId: e.target.value })}
                  disabled={merchants.length === 0}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {merchants.length === 0 ? 'Loading merchants...' : 'Select a merchant'}
                  </option>
                  {merchants.map((merchant) => (
                    <option key={merchant.merchantId} value={merchant.merchantId}>
                      {merchant.businessInfo.businessName} ({merchant.businessInfo.email})
                    </option>
                  ))}
                </select>
                {merchants.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {merchants.length} merchant{merchants.length !== 1 ? 's' : ''} available
                  </p>
                )}
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Subject <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="subject"
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of the issue"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Description <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="description"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description of the issue or request"
                  rows={4}
                  maxLength={maxDescriptionLength}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Provide as much detail as possible</span>
                  <span>
                    {formData.description.length}/{maxDescriptionLength}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="category"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as TicketCategory })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="technical_issue">Technical Issue</option>
                    <option value="billing_payment">Billing & Payment</option>
                    <option value="account_access">Account Access</option>
                    <option value="feature_request">Feature Request</option>
                    <option value="integration_support">Integration Support</option>
                    <option value="api_issue">API Issue</option>
                    <option value="payout_settlement">Payout & Settlement</option>
                    <option value="compliance_kyc">Compliance & KYC</option>
                    <option value="general_inquiry">General Inquiry</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label htmlFor="priority" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Priority <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="priority"
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TicketPriority })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* SLA Info based on priority */}
              {formData.priority && (
                <Alert className="bg-muted/50">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>{formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)} Priority:</strong>{' '}
                    First response in {getSLATarget(formData.priority, 'firstResponse')} minutes,
                    Resolution in {Math.round(getSLATarget(formData.priority, 'resolution') / 60)} hours
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Ticket'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
