import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity, 
  ScrollView,
  Dimensions 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getCalendarService } from '../services/calendarService';
import { getHybridSearchService } from '../services/hybridSearchService';
import { getContactService } from '../services/contactService';

export default function CalendarSuggestionsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedEventKeys, setExpandedEventKeys] = useState<Set<string>>(new Set());

  const { width } = Dimensions.get('window');
  const cellWidth = Math.floor((width - 40) / 7); // Ensure integer width for proper alignment

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cal = getCalendarService();
      const hybrid = getHybridSearchService();
      const contactService = getContactService();
      const events = await cal.getUpcomingEvents(30);

      // Add contact suggestions to each event
      const eventsWithSuggestions = await Promise.all(
        events.map(async (event) => {
          // Build query from event details
          const queryParts = [];
          if (event.title) queryParts.push(event.title);
          if (event.notes) queryParts.push(event.notes);
          if (event.location) queryParts.push(event.location);
          
          const query = queryParts.join(' ');
          if (!query.trim()) {
            return { ...event, suggestions: [] };
          }

          try {
            const tagOnlyResults = await hybrid.searchTagsOnly(query);
            
            // Filter by minimum similarity threshold (0.3 = 30% similarity)
            const relevantResults = tagOnlyResults.filter(r => r.score >= 0.3);
            
            // Limit to top 3 most relevant contacts
            const contactIds = relevantResults.slice(0, 3).map(r => r.contactId);
            const contacts = await Promise.all(contactIds.map(id => contactService.getContact(id)));
            const validContacts = contacts.filter(Boolean);
            
            return {
              ...event,
              suggestions: validContacts.map((contact, index) => ({
                contact,
                score: relevantResults[index]?.score || 0
              }))
            };
          } catch (error) {
            console.error('Error getting suggestions for event:', error);
            return { ...event, suggestions: [] };
          }
        })
      );

      setEvents(eventsWithSuggestions);
    } catch (e) {
      console.error('Calendar error:', e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate calendar grid data
  const generateCalendarData = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.startDate);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === date.getTime();
      });
      
      days.push({
        date: new Date(date),
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        isSelected: date.getTime() === selectedDate.getTime(),
        events: dayEvents
      });
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toDateString();
    return events.filter(event => 
      new Date(event.startDate).toDateString() === dateStr
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getEventKey = (item: any) => {
    const idPart = item.id ? String(item.id) : 'noid';
    const timePart = item.startDate ? String(new Date(item.startDate).getTime()) : 'notime';
    const titlePart = item.title ? String(item.title) : 'notitle';
    return `${idPart}-${timePart}-${titlePart}`;
  };

  const toggleSuggestions = (item: any) => {
    const key = getEventKey(item);
    setExpandedEventKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  useEffect(() => { load(); }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}> 
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  const calendarData = generateCalendarData();
  const selectedDateEvents = getEventsForDate(selectedDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <Text style={styles.subtitle}>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Month Navigation */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
            <MaterialIcons name="chevron-left" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
            <MaterialIcons name="chevron-right" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Day Headers */}
        <View style={styles.dayHeaders}>
          {dayNames.map(day => (
            <Text key={day} style={styles.dayHeader}>{day}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {Array.from({ length: 6 }, (_, weekIndex) => (
            <View key={weekIndex} style={styles.calendarWeek}>
              {Array.from({ length: 7 }, (_, dayIndex) => {
                const day = calendarData[weekIndex * 7 + dayIndex];
                return (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.dayCell,
                      day.isToday && styles.todayCell,
                      day.isSelected && styles.selectedCell,
                      !day.isCurrentMonth && styles.otherMonthCell
                    ]}
                    onPress={() => setSelectedDate(day.date)}
                  >
                    <Text style={[
                      styles.dayText,
                      day.isToday && styles.todayText,
                      day.isSelected && styles.selectedText,
                      !day.isCurrentMonth && styles.otherMonthText
                    ]}>
                      {day.date.getDate()}
                    </Text>
                    {day.events.length > 0 && (
                      <View style={styles.eventDots}>
                        {day.events.slice(0, 3).map((_, eventIndex) => (
                          <View key={eventIndex} style={styles.eventDot} />
                        ))}
                        {day.events.length > 3 && (
                          <Text style={styles.moreEvents}>+{day.events.length - 3}</Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Selected Date Events */}
        <View style={styles.eventsSection}>
          <Text style={styles.eventsTitle}>
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>

          {selectedDateEvents.length > 0 ? (
            <View style={styles.eventsListContainer}>
              {selectedDateEvents.map((item, index) => (
              <View key={`event-${index}`} style={styles.eventItem}>
                <View style={styles.eventDetails}>
                  <View style={styles.eventHeaderRow}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <Text style={styles.eventTimeRight}>{formatTime(new Date(item.startDate))}</Text>
                  </View>
                    {item.location && (
                      <Text style={styles.eventLocation}>
                        <MaterialIcons name="location-on" size={14} color="#8e8e93" />
                        {' '}{item.location}
                      </Text>
                    )}
                    {item.notes && (
                      <Text style={styles.eventNotes}>{item.notes}</Text>
                    )}
                    
                    {/* Contact Suggestions */}
                  {item.suggestions && item.suggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      <TouchableOpacity style={styles.suggestionsToggle} onPress={() => toggleSuggestions(item)}>
                        <Text style={styles.suggestionsTitle}>
                          Suggested contacts ({Math.min(3, item.suggestions.length)})
                        </Text>
                        <MaterialIcons 
                          name={expandedEventKeys.has(getEventKey(item)) ? 'expand-less' : 'expand-more'} 
                          size={22} 
                          color="#8e8e93" 
                        />
                      </TouchableOpacity>
                      {expandedEventKeys.has(getEventKey(item)) && (
                        <View>
                          {item.suggestions.slice(0, 3).map((suggestion: any, suggestionIndex: number) => (
                            <TouchableOpacity
                              key={`suggestion-${suggestionIndex}`}
                              style={styles.suggestionItem}
                              onPress={() => navigation.navigate('ContactDetail', { 
                                contactId: suggestion.contact.id 
                              })}
                            >
                              <View style={styles.suggestionContent}>
                                <Text style={styles.suggestionName}>
                                  {suggestion.contact.name}
                                </Text>
                                <Text style={styles.suggestionScore}>
                                  {(suggestion.score * 100).toFixed(0)}% match
                                </Text>
                              </View>
                              <MaterialIcons name="chevron-right" size={20} color="#c7c7cc" />
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noEventsContainer}>
              <MaterialIcons name="event" size={48} color="#c7c7cc" />
              <Text style={styles.noEventsText}>No events</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2f2f7',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#8e8e93',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5ea',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 17,
    color: '#8e8e93',
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5ea',
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  dayHeaders: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5ea',
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#8e8e93',
  },
  calendarGrid: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  calendarWeek: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f2f2f7',
  },
  dayCell: {
    flex: 1,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#f2f2f7',
  },
  todayCell: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    margin: 2,
  },
  selectedCell: {
    backgroundColor: '#e3f2fd',
    borderRadius: 20,
    margin: 2,
  },
  otherMonthCell: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  todayText: {
    color: '#fff',
    fontWeight: '700',
  },
  selectedText: {
    color: '#007AFF',
    fontWeight: '700',
  },
  otherMonthText: {
    color: '#8e8e93',
  },
  eventDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#007AFF',
    marginHorizontal: 1,
  },
  moreEvents: {
    fontSize: 8,
    color: '#007AFF',
    marginLeft: 2,
  },
  eventsSection: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  eventsTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  eventsList: {
    flex: 1,
  },
  eventItem: {
    flexDirection: 'column',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f2f2f7',
  },
  eventTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  eventTimeRight: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  eventDetails: {
    flex: 1,
    marginLeft: 12,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 2,
  },
  eventNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  noEventsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noEventsText: {
    fontSize: 16,
    color: '#8e8e93',
    marginTop: 8,
  },
  suggestionsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#f2f2f7',
  },
  suggestionsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 6,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  suggestionScore: {
    fontSize: 12,
    color: '#007AFF',
  },
});
