export const MOCK_PROBLEMS = [
  {
    id: "1",
    title: "Deep Pothole on Oak Avenue",
    category: "Infrastructure",
    description: "A large and deep pothole has formed in the middle of Oak Avenue, right near the intersection with 4th Street. It is causing cars to swerve dangerously into the oncoming lane to avoid hitting it.",
    severity: "High",
    location: "Oak Avenue & 4th Street",
    status: "In Progress",
    reporter: "Sarah Jenkins",
    date: "2026-06-25",
    upvotes: 42,
    timeline: [
      { date: "2026-06-25", status: "Reported", note: "Problem reported by Sarah Jenkins with photo confirmation." },
      { date: "2026-06-26", status: "Investigating", note: "Public Works Department reviewed the report and scheduled a crew." },
      { date: "2026-06-27", status: "In Progress", note: "Road maintenance crew is on-site repairing the asphalt surface." }
    ],
    comments: [
      { id: "c1", author: "David Miller", date: "2026-06-25", text: "Almost popped my tire on this yesterday! Thanks for reporting." },
      { id: "c2", author: "Elena Rostova", date: "2026-06-26", text: "Glad to see it's marked as Investigating so quickly." }
    ]
  },
  {
    id: "2",
    title: "Broken Streetlight near Metro Station",
    category: "Utilities",
    description: "The main streetlight outside the East Exit of the Central Metro Station has been completely out for three nights. The sidewalk is extremely dark, posing a safety hazard for commuters returning late.",
    severity: "Medium",
    location: "Central Metro Station, East Exit",
    status: "Reported",
    reporter: "Marcus Chen",
    date: "2026-06-26",
    upvotes: 18,
    timeline: [
      { date: "2026-06-26", status: "Reported", note: "Problem reported by Marcus Chen." }
    ],
    comments: [
      { id: "c3", author: "Aisha Patel", date: "2026-06-27", text: "It gets pitch black here after 8 PM. Definitely needs quick attention." }
    ]
  },
  {
    id: "3",
    title: "Illegal Trash Dumping in Maple Park",
    category: "Environment",
    description: "Someone has dumped several old mattresses, tires, and bags of household waste in the wooded area near the Maple Park picnic shelter. It is unsightly and attracting pests.",
    severity: "High",
    location: "Maple Park, near Picnic Area B",
    status: "Resolved",
    reporter: "Jessica Taylor",
    date: "2026-06-20",
    upvotes: 31,
    timeline: [
      { date: "2026-06-20", status: "Reported", note: "Dumping reported by Jessica Taylor." },
      { date: "2026-06-21", status: "Investigating", note: "Environmental enforcement officer visited the site to seek clues on the source." },
      { date: "2026-06-23", status: "In Progress", note: "Parks crew dispatched for waste removal." },
      { date: "2026-06-24", status: "Resolved", note: "All mattresses and refuse have been successfully cleared and disposed of." }
    ],
    comments: [
      { id: "c4", author: "Robert Shaw", date: "2026-06-21", text: "Unbelievable that people think this is okay. Hope they find who did it." },
      { id: "c5", author: "Jessica Taylor", date: "2026-06-24", text: "Verified this morning that the park is completely clean now! Thank you!" }
    ]
  },
  {
    id: "4",
    title: "Overgrown Vegetation Blocking Stop Sign",
    category: "Safety & Health",
    description: "The branches from a large private hedge have overgrown the stop sign at the corner of Elm Road and River Street. Drivers cannot see the sign until they are already in the intersection, causing close calls.",
    severity: "High",
    location: "Elm Road & River Street",
    status: "Investigating",
    reporter: "Liam O'Connor",
    date: "2026-06-26",
    upvotes: 25,
    timeline: [
      { date: "2026-06-26", status: "Reported", note: "Reported by Liam O'Connor." },
      { date: "2026-06-27", status: "Investigating", note: "City inspector verified the visibility obstruction and is contacting the property owner." }
    ],
    comments: []
  }
];
