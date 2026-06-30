import { 
  Construction, 
  Lightbulb, 
  Droplet, 
  Filter, 
  Trash2, 
  Zap, 
  Car, 
  Bus, 
  Trees, 
  Leaf, 
  ShieldAlert, 
  HeartPulse, 
  Landmark, 
  PawPrint, 
  Fence, 
  HardHat, 
  Wifi, 
  Hammer, 
  CloudRain, 
  HelpCircle 
} from 'lucide-react';

export const CATEGORIES = [
  "Roads & Potholes",
  "Street Lights",
  "Water Supply",
  "Drainage & Sewage",
  "Garbage & Waste Management",
  "Electricity",
  "Traffic & Parking",
  "Public Transport",
  "Parks & Playgrounds",
  "Environment & Pollution",
  "Safety & Crime",
  "Health & Sanitation",
  "Government Facilities",
  "Animal Issues",
  "Encroachment",
  "Construction Issues",
  "Internet & Telecom",
  "Public Property Damage",
  "Flooding",
  "Other"
];

const CATEGORY_MAP = {
  "Roads & Potholes": { 
    icon: Construction, 
    bg: "bg-rose-500/10", 
    border: "border-rose-500/20", 
    text: "text-rose-400",
    complaintEmail: "roads.maintenance@communityhero.gov",
    complaintWebsite: "https://municipal.gov/roads-and-highways"
  },
  "Street Lights": { 
    icon: Lightbulb, 
    bg: "bg-amber-500/10", 
    border: "border-amber-500/20", 
    text: "text-amber-400",
    complaintEmail: "streetlights.ops@communityhero.gov",
    complaintWebsite: "https://municipal.gov/power-streetlights"
  },
  "Water Supply": { 
    icon: Droplet, 
    bg: "bg-blue-500/10", 
    border: "border-blue-500/20", 
    text: "text-blue-400",
    complaintEmail: "water.supply@communityhero.gov",
    complaintWebsite: "https://municipal.gov/water-board"
  },
  "Drainage & Sewage": { 
    icon: Filter, 
    bg: "bg-slate-500/10", 
    border: "border-slate-500/20", 
    text: "text-slate-400",
    complaintEmail: "sanitation@communityhero.gov",
    complaintWebsite: "https://municipal.gov/sewerage-board"
  },
  "Garbage & Waste Management": { 
    icon: Trash2, 
    bg: "bg-red-500/10", 
    border: "border-red-500/20", 
    text: "text-red-400",
    complaintEmail: "waste.mgmt@communityhero.gov",
    complaintWebsite: "https://municipal.gov/solid-waste"
  },
  "Electricity": { 
    icon: Zap, 
    bg: "bg-yellow-500/10", 
    border: "border-yellow-500/20", 
    text: "text-yellow-400",
    complaintEmail: "electricity.power@communityhero.gov",
    complaintWebsite: "https://municipal.gov/electricity-distribution"
  },
  "Traffic & Parking": { 
    icon: Car, 
    bg: "bg-indigo-500/10", 
    border: "border-indigo-500/20", 
    text: "text-indigo-400",
    complaintEmail: "traffic.control@communityhero.gov",
    complaintWebsite: "https://municipal.gov/traffic-management"
  },
  "Public Transport": { 
    icon: Bus, 
    bg: "bg-cyan-500/10", 
    border: "border-cyan-500/20", 
    text: "text-cyan-400",
    complaintEmail: "transit@communityhero.gov",
    complaintWebsite: "https://municipal.gov/metro-transit"
  },
  "Parks & Playgrounds": { 
    icon: Trees, 
    bg: "bg-emerald-500/10", 
    border: "border-emerald-500/20", 
    text: "text-emerald-400",
    complaintEmail: "parks.rec@communityhero.gov",
    complaintWebsite: "https://municipal.gov/parks-gardens"
  },
  "Environment & Pollution": { 
    icon: Leaf, 
    bg: "bg-green-500/10", 
    border: "border-green-500/20", 
    text: "text-green-400",
    complaintEmail: "env.pollution@communityhero.gov",
    complaintWebsite: "https://municipal.gov/pollution-control"
  },
  "Safety & Crime": { 
    icon: ShieldAlert, 
    bg: "bg-rose-500/10", 
    border: "border-rose-500/20", 
    text: "text-rose-400",
    complaintEmail: "safety.police@communityhero.gov",
    complaintWebsite: "https://municipal.gov/safety-precincts"
  },
  "Health & Sanitation": { 
    icon: HeartPulse, 
    bg: "bg-red-500/10", 
    border: "border-red-500/20", 
    text: "text-red-400",
    complaintEmail: "health.dept@communityhero.gov",
    complaintWebsite: "https://municipal.gov/healthcare-sanitation"
  },
  "Government Facilities": { 
    icon: Landmark, 
    bg: "bg-purple-500/10", 
    border: "border-purple-500/20", 
    text: "text-purple-400",
    complaintEmail: "civic.facilities@communityhero.gov",
    complaintWebsite: "https://municipal.gov/city-hall"
  },
  "Animal Issues": { 
    icon: PawPrint, 
    bg: "bg-amber-500/10", 
    border: "border-amber-500/20", 
    text: "text-amber-450",
    complaintEmail: "animal.welfare@communityhero.gov",
    complaintWebsite: "https://municipal.gov/animal-control"
  },
  "Encroachment": { 
    icon: Fence, 
    bg: "bg-slate-555/10", 
    border: "border-slate-500/20", 
    text: "text-slate-400",
    complaintEmail: "encroachment.triage@communityhero.gov",
    complaintWebsite: "https://municipal.gov/town-planning"
  },
  "Construction Issues": { 
    icon: HardHat, 
    bg: "bg-amber-500/10", 
    border: "border-amber-500/20", 
    text: "text-amber-400",
    complaintEmail: "building.inspectors@communityhero.gov",
    complaintWebsite: "https://municipal.gov/permits-inspections"
  },
  "Internet & Telecom": { 
    icon: Wifi, 
    bg: "bg-sky-500/10", 
    border: "border-sky-500/20", 
    text: "text-sky-400",
    complaintEmail: "broadband@communityhero.gov",
    complaintWebsite: "https://municipal.gov/telecom-division"
  },
  "Public Property Damage": { 
    icon: Hammer, 
    bg: "bg-rose-500/10", 
    border: "border-rose-500/20", 
    text: "text-rose-400",
    complaintEmail: "public.property@communityhero.gov",
    complaintWebsite: "https://municipal.gov/facilities-upkeep"
  },
  "Flooding": { 
    icon: CloudRain, 
    bg: "bg-blue-500/10", 
    border: "border-blue-500/20", 
    text: "text-blue-400",
    complaintEmail: "flood.disaster@communityhero.gov",
    complaintWebsite: "https://municipal.gov/flood-emergency"
  },
  "Other": { 
    icon: HelpCircle, 
    bg: "bg-zinc-500/10", 
    border: "border-zinc-500/20", 
    text: "text-zinc-400",
    complaintEmail: "general.grievances@communityhero.gov",
    complaintWebsite: "https://municipal.gov/citizens-triage"
  }
};

export function getCategoryConfig(categoryName) {
  return CATEGORY_MAP[categoryName] || { icon: HelpCircle, bg: "bg-zinc-500/10", border: "border-zinc-500/20", text: "text-zinc-400" };
}
