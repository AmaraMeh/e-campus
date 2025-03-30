// types/timetable.ts

export interface TimeSlot { start: string; end: string; }
export interface ScheduleEntry { time: TimeSlot; subject: string; type: 'Cours' | 'TD' | 'TP' | 'MP'; location: string; teacher?: string; frequency?: 'weekly' | 'biweekly'; details?: string; }
export interface DaySchedule { Dimanche?: ScheduleEntry[]; Lundi?: ScheduleEntry[]; Mardi?: ScheduleEntry[]; Mercredi?: ScheduleEntry[]; Jeudi?: ScheduleEntry[]; }
export interface GroupSchedule { [groupName: string]: DaySchedule; }
export interface SectionSchedule { [sectionName: string]: GroupSchedule; }
export interface SpecialtyTimetable { specialty: string; year: number; semester: number; sections: SectionSchedule; }