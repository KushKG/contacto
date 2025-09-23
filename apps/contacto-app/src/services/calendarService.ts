import * as Calendar from 'expo-calendar';

export interface CalendarEventLite {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  notes?: string | null;
  location?: string | null;
  calendarId: string;
}

class CalendarService {
  private permissionGranted: boolean = false;

  async ensurePermission(): Promise<boolean> {
    if (this.permissionGranted) return true;
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    this.permissionGranted = status === 'granted';
    return this.permissionGranted;
  }

  async getDefaultCalendarId(): Promise<string | null> {
    if (!(await this.ensurePermission())) return null;
    const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const primary = cals.find(c => c.allowsModifications) || cals[0];
    return primary ? primary.id : null;
  }

  async getUpcomingEvents(daysAhead: number = 14): Promise<CalendarEventLite[]> {
    if (!(await this.ensurePermission())) return [];
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    if (calendars.length === 0) return [];

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const results: CalendarEventLite[] = [];
    for (const cal of calendars) {
      try {
        const events = await Calendar.getEventsAsync([cal.id], startDate, endDate);
        for (const e of events) {
          results.push({
            id: e.id,
            title: e.title || '(No title)',
            startDate: new Date(e.startDate),
            endDate: new Date(e.endDate),
            notes: e.notes ?? null,
            location: e.location ?? null,
            calendarId: cal.id,
          });
        }
      } catch {}
    }
    // Sort by start date
    return results.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }
}

let calendarServiceInstance: CalendarService | null = null;
export const getCalendarService = (): CalendarService => {
  if (!calendarServiceInstance) calendarServiceInstance = new CalendarService();
  return calendarServiceInstance;
};
