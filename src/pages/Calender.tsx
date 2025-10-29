import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Edit, Trash2, Clock, User, Building, MapPin } from 'lucide-react';
import { Layout } from '../components/Layout/Layout';
import CreateEditEventModal from '../components/modals/CreateEditEventModal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  type: 'meeting' | 'site_visit' | 'inspection' | 'deadline' | 'delivery' | 'other';
  project?: string;
  client?: string;
  location?: string;
  priority: 'low' | 'medium' | 'high';
  reminder: number;
  attendees: string[];
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  created_by: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
}

export const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date('2025-10-15T11:57:00+05:30'));
  const [viewType, setViewType] = useState<'month' | 'week' | 'day'>('month');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const toDisplayDateFormat = (dateStr: string): string => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };

  const toDatabaseDateFormat = (dateStr: string): string => {
    if (!dateStr) return '';
    const [day, month, year] = dateStr.split('-');
    return `${year}-${month}-${day}`;
  };

  const formatDateToISO = (date: Date): string => {
    const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const year = istDate.getFullYear().toString().padStart(4, '0');
    const month = (istDate.getMonth() + 1).toString().padStart(2, '0');
    const day = istDate.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeToIST = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata'
    });
  };

  const getProjectName = (projectId?: string): string => {
    if (!projectId) return '';
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : projectId;
  };

  useEffect(() => {
    if (user?.id) {
      fetchEvents();
      fetchProjects();
      fetchUsers();
    } else {
      console.warn('No authenticated user found, skipping data fetch');
      setLoading(false);
      setShowSuccessModal('Please log in to view calendar data.');
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('created_by', user?.id)
        .order('start_date', { ascending: true });

      if (error) throw new Error(`Failed to fetch events: ${error.message}`);

      setEvents(data || []);
    } catch (error: any) {
      console.error('Error fetching events:', error.message);
      setShowSuccessModal('Failed to fetch events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('created_by', user?.id);

      if (error) throw new Error(`Failed to fetch projects: ${error.message}`);

      setProjects(data || []);
    } catch (error: any) {
      console.error('Error fetching projects:', error.message);
      setShowSuccessModal('Failed to fetch projects. Please try again.');
    }
  };

  const fetchUsers = async () => {
    try {
      if (!user?.id) {
        console.warn('No authenticated user found, skipping user fetch');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('created_by', user.id);

      if (error) throw new Error(`Failed to fetch users: ${error.message} (code: ${error.code})`);

      if (!data || data.length === 0) {
        console.warn('No users found created by:', user.id);
      }

      setUsers(data || []);
    } catch (error: any) {
      console.error('Detailed error fetching users:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      setShowSuccessModal('Failed to fetch users. Please ensure the users table is set up correctly.');
    }
  };

  const sendEventEmail = async (
    attendeeEmail: string,
    eventData: {
      title: string;
      description?: string;
      start_date: string;
      end_date: string;
      start_time?: string;
      end_time?: string;
      location?: string;
      all_day: boolean;
      type: string;
      priority: string;
    }
  ) => {
    try {
      // Get attendee name from users list
      const attendeeUser = users.find(u => u.email === attendeeEmail);
      const attendeeName = attendeeUser?.name || '';

      // Get organizer details
      const organizerName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Event Organizer';
      const organizerEmail = user?.email || '';

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-calendar-invite`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendeeEmail,
          attendeeName,
          eventTitle: eventData.title,
          eventDescription: eventData.description,
          startDate: eventData.start_date,
          endDate: eventData.end_date,
          startTime: eventData.start_time,
          endTime: eventData.end_time,
          location: eventData.location,
          allDay: eventData.all_day,
          eventType: eventData.type,
          priority: eventData.priority,
          organizerName,
          organizerEmail,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to send email: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Email sent successfully:', data);
    } catch (error: any) {
      console.error('Error sending email:', error.message);
      // Don't show error to user, just log it
      console.warn('Event created but email notification failed');
    }
  };

  const getMonthData = (date: Date) => {
    const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const year = istDate.getFullYear();
    const month = istDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return { days, firstDay, lastDay };
  };

  const { days } = getMonthData(currentDate);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date('2025-10-15T11:57:00+05:30'));
  };

  const getEventsForDate = (date: Date) => {
    const dateString = formatDateToISO(date);
    return events.filter(event => {
      return dateString >= event.start_date && dateString <= event.end_date;
    });
  };

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'meeting': 'bg-blue-500',
      'site_visit': 'bg-green-500',
      'inspection': 'bg-orange-500',
      'deadline': 'bg-red-500',
      'delivery': 'bg-purple-500',
      'other': 'bg-gray-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'high': 'border-red-500 bg-red-50',
      'medium': 'border-orange-500 bg-orange-50',
      'low': 'border-green-500 bg-green-50'
    };
    return colors[priority] || 'border-gray-500 bg-gray-50';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'confirmed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'completed': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return '';
    
    // Regular expressions to match date formats
    const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/;
    const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/;

    if (yyyymmdd.test(dateStr)) {
      // Input is YYYY-MM-DD, return as is
      return dateStr;
    } else if (ddmmyyyy.test(dateStr)) {
      // Input is DD-MM-YYYY, convert to YYYY-MM-DD
      const [day, month, year] = dateStr.split('-');
      return `${year}-${month}-${day}`;
    } else {
      throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD or DD-MM-YYYY.`);
    }
  };

  const handleCreateEvent = async (eventData: Omit<CalendarEvent, 'id' | 'created_at' | 'created_by'>) => {
    try {
      const startDateInput = eventData.start_date;
      const endDateInput = eventData.end_date;
      console.log('Input start_date:', startDateInput);
      console.log('Input end_date:', endDateInput);

      // Normalize dates to YYYY-MM-DD
      const startDate = normalizeDate(startDateInput);
      const endDate = normalizeDate(endDateInput);
      console.log('Normalized start_date:', startDate);
      console.log('Normalized end_date:', endDate);

      // Validate dates
      if (!startDate || isNaN(new Date(startDate).getTime())) {
        throw new Error('Invalid start date format after normalization. Expected valid date, got: ' + startDate);
      }
      if (!endDate || isNaN(new Date(endDate).getTime())) {
        throw new Error('Invalid end date format after normalization. Expected valid date, got: ' + endDate);
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .insert([{
          ...eventData,
          start_date: startDate,
          end_date: endDate,
          start_time: eventData.start_time ? formatTimeToIST(eventData.start_time) : null,
          end_time: eventData.end_time ? formatTimeToIST(eventData.end_time) : null,
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) throw new Error(`Failed to create event: ${error.message}`);

      setEvents([...events, data]);

      // Send email invitations to all attendees
      for (const attendeeEmail of eventData.attendees) {
        await sendEventEmail(attendeeEmail, {
          title: eventData.title,
          description: eventData.description,
          start_date: data.start_date,
          end_date: data.end_date,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          location: eventData.location,
          all_day: eventData.all_day,
          type: eventData.type,
          priority: eventData.priority,
        });
      }

      setShowCreateModal(false);
      setSelectedDate('');
      setShowSuccessModal('Event created successfully!');
    } catch (error: any) {
      console.error('Error creating event:', error.message);
      setShowSuccessModal('Failed to create event. Please try again.');
    }
  };

  const handleEditEvent = async (eventData: Omit<CalendarEvent, 'id' | 'created_at' | 'created_by'>) => {
    if (!selectedEvent) return;

    try {
      const startDate = normalizeDate(eventData.start_date);
      const endDate = normalizeDate(eventData.end_date);

      const { data, error } = await supabase
        .from('calendar_events')
        .update({
          ...eventData,
          start_date: startDate,
          end_date: endDate,
          start_time: eventData.start_time ? formatTimeToIST(eventData.start_time) : null,
          end_time: eventData.end_time ? formatTimeToIST(eventData.end_time) : null
        })
        .eq('id', selectedEvent.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update event: ${error.message}`);

      setEvents(events.map(event => event.id === selectedEvent.id ? data : event));

      // Send email invitations only to newly added attendees
      const newAttendees = eventData.attendees.filter(a => !selectedEvent.attendees.includes(a));
      for (const attendeeEmail of newAttendees) {
        await sendEventEmail(attendeeEmail, {
          title: eventData.title,
          description: eventData.description,
          start_date: data.start_date,
          end_date: data.end_date,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          location: eventData.location,
          all_day: eventData.all_day,
          type: eventData.type,
          priority: eventData.priority,
        });
      }

      setShowEditModal(false);
      setSelectedEvent(null);
      setShowSuccessModal('Event updated successfully!');
    } catch (error: any) {
      console.error('Error updating event:', error.message);
      setShowSuccessModal('Failed to update event. Please try again.');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw new Error(`Failed to delete event: ${error.message}`);

      setEvents(events.filter(event => event.id !== eventId));
      setShowDeleteModal(null);
      setShowSuccessModal('Event deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting event:', error.message);
      setShowSuccessModal('Failed to delete event. Please try again.');
    }
  };

  const handleDayClick = (date: Date) => {
    const dateString = toDisplayDateFormat(formatDateToISO(date));
    setSelectedDate(dateString);
    setShowCreateModal(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent({
      ...event,
      start_date: toDisplayDateFormat(event.start_date),
      end_date: toDisplayDateFormat(event.end_date)
    });
    setShowEditModal(true);
  };

  const todayEvents = getEventsForDate(new Date('2025-10-15T11:57:00+05:30'));

  const upcomingEvents = events
    .filter(event => {
      const eventDate = new Date(event.start_date);
      const today = new Date('2025-10-15T11:57:00+05:30');
      today.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate > today;
    })
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .slice(0, 5);

  const formatTime = (time: string) => {
    if (!time) return '';
    return formatTimeToIST(time);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">Calendar & Scheduling</h1>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-lg p-1">
              <button
                onClick={() => setViewType('month')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewType === 'month'
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewType('week')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewType === 'week'
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewType('day')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewType === 'day'
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Day
              </button>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>New Event</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={goToToday}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  Today
                </button>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayNames.map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-slate-600">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, index) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = formatDateToISO(day) === formatDateToISO(new Date('2025-10-15T11:57:00+05:30'));
                    const dayEvents = getEventsForDate(day);

                    return (
                      <div
                        key={index}
                        onClick={() => handleDayClick(day)}
                        className={`min-h-[100px] p-2 border border-slate-200 cursor-pointer hover:bg-blue-50 transition-colors ${
                          !isCurrentMonth ? 'bg-slate-50 text-slate-400' : 'bg-white'
                        } ${isToday ? 'bg-blue-100 border-blue-300' : ''}`}
                      >
                        <div className={`text-sm font-medium mb-1 ${
                          isToday ? 'text-blue-700' : isCurrentMonth ? 'text-slate-900' : 'text-slate-400'
                        }`}>
                          {day.getDate()}
                        </div>

                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEventClick(event);
                              }}
                              className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${getEventTypeColor(event.type)} text-white truncate`}
                              title={event.title}
                            >
                              {event.all_day ? event.title : `${formatTime(event.start_time)} ${event.title}`}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-slate-500 text-center">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Today's Events</h3>
              {todayEvents.length > 0 ? (
                <div className="space-y-3">
                  {todayEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className={`p-3 rounded-lg border-l-4 cursor-pointer hover:bg-slate-50 transition-colors ${getPriorityColor(event.priority)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900 text-sm">{event.title}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            {!event.all_day && (
                              <div className="flex items-center space-x-1 text-xs text-slate-600">
                                <Clock className="w-3 h-3" />
                                <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                              </div>
                            )}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                              {event.status}
                            </span>
                          </div>
                          {event.location && (
                            <div className="flex items-center space-x-1 text-xs text-slate-500 mt-1">
                              <MapPin className="w-3 h-3" />
                              <span>{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <CalendarIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No events scheduled for today</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Events</h3>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className="p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <h4 className="font-medium text-slate-900 text-sm">{event.title}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center space-x-1 text-xs text-slate-600">
                          <CalendarIcon className="w-3 h-3" />
                          <span>{toDisplayDateFormat(event.start_date)}</span>
                        </div>
                        {!event.all_day && (
                          <div className="flex items-center space-x-1 text-xs text-slate-600">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(event.start_time)}</span>
                          </div>
                        )}
                      </div>
                      {event.project && (
                        <div className="flex items-center space-x-1 text-xs text-slate-500 mt-1">
                          <Building className="w-3 h-3" />
                          <span>{getProjectName(event.project)}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1 text-xs text-slate-500 mt-1">
                        <User className="w-3 h-3" />
                        <span>
                          {event.attendees.length > 0
                            ? event.attendees
                                .map((email) => {
                                  const user = users.find((u) => u.email === email);
                                  return user ? user.name : email;
                                })
                                .join(', ')
                            : 'No attendees'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No upcoming events</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Event Statistics</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Total Events</span>
                  <span className="font-bold text-slate-900">{events.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Today</span>
                  <span className="font-bold text-blue-600">{todayEvents.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">This Week</span>
                  <span className="font-bold text-green-600">
                    {events.filter(event => {
                      const eventDate = new Date(event.start_date);
                      const today = new Date('2025-10-15T11:57:00+05:30');
                      const weekStart = new Date(today);
                      weekStart.setDate(today.getDate() - today.getDay());
                      weekStart.setHours(0, 0, 0, 0);
                      const weekEnd = new Date(weekStart);
                      weekEnd.setDate(weekStart.getDate() + 6);
                      weekEnd.setHours(23, 59, 59, 999);
                      return eventDate >= weekStart && eventDate <= weekEnd;
                    }).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Confirmed</span>
                  <span className="font-bold text-purple-600">
                    {events.filter(event => event.status === 'confirmed').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">All Events</h3>
            <span className="text-sm text-slate-600">Showing {events.length} events</span>
          </div>

          <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
            {events.map((event) => (
              <div key={event.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`w-3 h-3 rounded-full mt-2 ${getEventTypeColor(event.type)}`}></div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-slate-900">{event.title}</h4>
                          {event.description && (
                            <p className="text-sm text-slate-600 mt-1">{event.description}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                            <div className="flex items-center space-x-1">
                              <CalendarIcon className="w-3 h-3" />
                              <span>{toDisplayDateFormat(event.start_date)}</span>
                            </div>
                            {!event.all_day && (
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                              </div>
                            )}
                            {event.project && (
                              <div className="flex items-center space-x-1">
                                <Building className="w-3 h-3" />
                                <span>{getProjectName(event.project)}</span>
                              </div>
                            )}
                            {event.client && (
                              <div className="flex items-center space-x-1">
                                <User className="w-3 h-3" />
                                <span>{event.client}</span>
                              </div>
                            )}
                            {event.location && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-3 h-3" />
                                <span>{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                            {event.status}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            event.priority === 'high' ? 'bg-red-100 text-red-800' :
                            event.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {event.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-4">
                    <button
                      onClick={() => handleEventClick(event)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Event"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(event.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {events.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No events found</h3>
              <p className="text-slate-600 mb-4">Create your first event to get started.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Create Event
              </button>
            </div>
          )}
        </div>

        {showCreateModal && (
          <CreateEditEventModal
            initialDate={selectedDate}
            projects={projects}
            users={users}
            onClose={() => {
              setShowCreateModal(false);
              setSelectedDate('');
            }}
            onSave={handleCreateEvent}
          />
        )}
        
        {showEditModal && selectedEvent && (
          <CreateEditEventModal
            event={selectedEvent}
            projects={projects}
            users={users}
            onClose={() => {
              setShowEditModal(false);
              setSelectedEvent(null);
            }}
            onSave={handleEditEvent}
          />
        )}

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Confirm Delete</h3>
              <p className="text-sm text-slate-600 mb-6">Are you sure you want to delete this event?</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="px-4 py-2 bg-gray-200 text-slate-900 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteEvent(showDeleteModal)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                {showSuccessModal.includes('Failed') ? 'Error' : 'Success'}
              </h3>
              <p className="text-sm text-slate-600 mb-6">{showSuccessModal}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowSuccessModal(null)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};