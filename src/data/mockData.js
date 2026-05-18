export const USERS = [
  {
    username: 'coach_verma',
    password: 'coach123',
    role: 'coach',
    name: 'Coach R. Verma',
    initials: 'RV',
  },
  {
    username: 'arjun_s',
    password: 'captain123',
    role: 'captain',
    name: 'Arjun Singh',
    initials: 'AS',
    weightClass: '73kg',
    year: '3rd Year',
    bestSnatch: 112,
    bestCJ: 134,
    bodyWeight: 71.4,
  },
  {
    username: 'rahul_k',
    password: 'athlete123',
    role: 'athlete',
    name: 'Rahul Kumar',
    initials: 'RK',
    weightClass: '61kg',
    year: '2nd Year',
    bestSnatch: 95,
    bestCJ: 103,
    bodyWeight: 60.2,
  },
  {
    username: 'priya_s',
    password: 'athlete456',
    role: 'athlete',
    name: 'Priya Sharma',
    initials: 'PS',
    weightClass: '59kg',
    year: '4th Year',
    bestSnatch: 84,
    bestCJ: 92,
    bodyWeight: 58.1,
  },
]

export const ATHLETES = [
  { id: 1, name: 'Arjun Singh',   initials: 'AS', role: 'captain', year: '3rd', weightClass: '73kg', snatch: 112, cj: 134, total: 246, program: 'Strength',  status: 'active' },
  { id: 2, name: 'Rahul Kumar',   initials: 'RK', role: 'athlete', year: '2nd', weightClass: '61kg', snatch: 95,  cj: 103, total: 198, program: 'Technique', status: 'active' },
  { id: 3, name: 'Priya Sharma',  initials: 'PS', role: 'athlete', year: '4th', weightClass: '59kg', snatch: 84,  cj: 92,  total: 176, program: 'Strength',  status: 'active' },
  { id: 4, name: 'Vikram Rao',    initials: 'VR', role: 'athlete', year: '4th', weightClass: '89kg', snatch: 119, cj: 142, total: 261, program: 'Strength',  status: 'leave'  },
  { id: 5, name: 'Sneha Mehta',   initials: 'SM', role: 'athlete', year: '1st', weightClass: '49kg', snatch: 52,  cj: 67,  total: 119, program: 'Beginner', status: 'new'    },
  { id: 6, name: 'Kartik Patel',  initials: 'KP', role: 'athlete', year: '3rd', weightClass: '81kg', snatch: 107, cj: 128, total: 235, program: 'Technique', status: 'active' },
  { id: 7, name: 'Neha Dubey',    initials: 'ND', role: 'athlete', year: '2nd', weightClass: '64kg', snatch: 78,  cj: 94,  total: 172, program: 'Technique', status: 'active' },
]

export const UPCOMING_SESSIONS = [
  { id: 1, name: 'Snatch Technique Session', day: 20, month: 'May', time: '6:00 AM', venue: 'SAC Gym', type: 'team',     group: 'All Athletes'  },
  { id: 2, name: 'Strength Block — Squats',  day: 21, month: 'May', time: '5:30 AM', venue: 'SAC Gym', type: 'advanced', group: 'Advanced Group' },
  { id: 3, name: 'Clean & Jerk Day',         day: 23, month: 'May', time: '6:00 AM', venue: 'SAC Gym', type: 'team',     group: 'All Athletes'  },
]

export const TEAM_ACTIVITY = [
  { id: 1, text: ['Arjun Singh', ' set a new Snatch PR — ', '112kg'],          color: 'green',  time: '2h ago'    },
  { id: 2, text: ['Rahul Kumar', ' completed Strength Block Week 4'],           color: 'blue',   time: '5h ago'    },
  { id: 3, text: ['Priya Sharma', ' logged session — Clean & Jerk focus'],      color: 'gold',   time: 'Yesterday' },
  { id: 4, text: ['Sneha Mehta', ' joined the team — 49kg category'],           color: 'purple', time: '2 days ago'},
  { id: 5, text: ['Vikram Rao', ' set a Clean & Jerk PR — ', '152kg'],          color: 'green',  time: '3 days ago'},
  { id: 6, text: ['Team session', ' completed — 11/14 athletes attended'],      color: 'blue',   time: '3 days ago'},
]

export const PROGRAMS = [
  { label: 'Strength Block (Week 4 / 8)',        pct: 50, colorClass: ''       },
  { label: 'Technique Refinement (Week 6 / 8)',  pct: 75, colorClass: 'gold'   },
  { label: 'Beginner Foundation (Week 2 / 12)',  pct: 17, colorClass: 'green'  },
  { label: 'Monthly Attendance Rate',            pct: 87, colorClass: 'purple' },
]
