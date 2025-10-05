import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Search, ListFilter as Filter, Eye, CreditCard as Edit, Trash2, Clock, User, Building, MapPin } from 'lucide-react';
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

export const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'month' | 'week' | 'day'>('month');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    if (user) {
      fetchEvents();
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

      if (error) throw error;

      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthData = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
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
    setCurrentDate(new Date());
  };

  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventStart = event.start_date;
      const eventEnd = event.end_date;
      return dateString >= eventStart && dateString <= eventEnd;
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

  const handleCreateEvent = async (eventData: Omit<CalendarEvent, 'id' | 'created_at' | 'created_by'>) => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert([{
          ...eventData,
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      setEvents([...events, data]);
      setShowCreateModal(false);
      setSelectedDate('');
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    }
  };

  const handleEditEvent = async (eventData: Omit<CalendarEvent, 'id' | 'created_at' | 'created_by'>) => {
    if (!selectedEvent) return;

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .update(eventData)
        .eq('id', selectedEvent.id)
        .select()
        .single();

      if (error) throw error;

      setEvents(events.map(event => event.id === selectedEvent.id ? data : event));
      setShowEditModal(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event. Please try again.');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setEvents(events.filter(event => event.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const handleDayClick = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    setSelectedDate(dateString);
    setShowCreateModal(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEditModal(true);
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || event.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const todayEvents = getEventsForDate(new Date());
  const upcomingEvents = events
    .filter(event => new Date(event.start_date) > new Date())
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .slice(0, 5);

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
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

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="all">All Types</option>
                <option value="meeting">Meetings</option>
                <option value="site_visit">Site Visits</option>
                <option value="inspection">Inspections</option>
                <option value="deadline">Deadlines</option>
                <option value="delivery">Deliveries</option>
                <option value="other">Other</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
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
                    const isToday = day.toDateString() === new Date().toDateString();
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
                          <span>{new Date(event.start_date).toLocaleDateString('en-IN')}</span>
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
                          <span>{event.project}</span>
                        </div>
                      )}
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
                      const today = new Date();
                      const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
                      const weekEnd = new Date(weekStart);
                      weekEnd.setDate(weekStart.getDate() + 6);
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
            <span className="text-sm text-slate-600">Showing {filteredEvents.length} of {events.length} events</span>
          </div>

          <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
            {filteredEvents.map((event) => (
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
                              <span>{new Date(event.start_date).toLocaleDateString('en-IN')}</span>
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
                                <span>{event.project}</span>
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
                      onClick={() => handleDeleteEvent(event.id)}
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

          {filteredEvents.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No events found</h3>
              <p className="text-slate-600 mb-4">
                {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Create your first event to get started.'
                }
              </p>
              {(!searchTerm && typeFilter === 'all' && statusFilter === 'all') && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Create Event
                </button>
              )}
            </div>
          )}
        </div>

        {showCreateModal && (
          <CreateEditEventModal
            initialDate={selectedDate}
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
            onClose={() => {
              setShowEditModal(false);
              setSelectedEvent(null);
            }}
            onSave={handleEditEvent}
          />
        )}
      </div>
    </Layout>
  );
};
