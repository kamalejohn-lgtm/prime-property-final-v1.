import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  Tv, Trophy, Calendar, Activity, Play, 
  Volume2, Maximize, Share2, Info,
  TrendingUp, Award
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, where, limit } from 'firebase/firestore';

interface FootballClub {
  id: string;
  name: string;
  logo_url?: string;
  played: number;
  points: number;
  unit?: string;
}

interface FootballMatch {
  id: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  time: string;
  status: "live" | "upcoming" | "finished";
  date: string;
  stadium: string;
  stream_url?: string;
}

const FootballTV = () => {
  const [clubs, setClubs] = useState<FootballClub[]>([]);
  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [liveMatch, setLiveMatch] = useState<FootballMatch | null>(null);

  useEffect(() => {
    const qClubs = query(collection(db, "football_clubs"), orderBy("points", "desc"));
    const unsubClubs = onSnapshot(qClubs, (snap) => {
      setClubs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FootballClub)));
    });

    const qMatches = query(collection(db, "football_matches"), orderBy("date", "desc"));
    const unsubMatches = onSnapshot(qMatches, (snap) => {
      const allMatches = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FootballMatch));
      setMatches(allMatches);
      
      const live = allMatches.find(m => m.status === 'live');
      if (live) {
        setLiveMatch(live);
      } else {
        setLiveMatch(null);
      }
    });

    return () => {
      unsubClubs();
      unsubMatches();
    };
  }, []);

  const fixtures = matches.filter(m => m.status === 'upcoming').slice(0, 5);
  const standings = clubs.slice(0, 10);

  return (
    <div className="min-h-screen bg-[#07090f] text-white pt-24 pb-20 font-sans">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-red-600 animate-pulse px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-white rounded-full" /> LIVE
              </span>
              <span className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Tv size={14} /> ECOMIG HD CHANNEL 01
              </span>
            </div>
            <h1 className="text-5xl font-black uppercase tracking-tighter italic">Football <span className="text-green-500">Live</span></h1>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 px-6 py-3 rounded-xl flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Viewers</p>
                <p className="text-lg font-black font-mono">1.2K</p>
              </div>
              <Activity className="text-green-500" />
            </div>
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 px-6 py-3 rounded-xl flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Network</p>
                <p className="text-lg font-black font-mono">5G HD</p>
              </div>
              <TrendingUp className="text-blue-500" />
            </div>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* PLAYER & STATS */}
          <div className="lg:col-span-8 space-y-6">
            {/* VIDEO PLAYER COMPONENT */}
            <div className="relative aspect-video bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-[0_0_50px_rgba(34,197,94,0.1)] group">
              {liveMatch && liveMatch.stream_url ? (
                <iframe 
                  src={liveMatch.stream_url.includes('youtube.com') && !liveMatch.stream_url.includes('embed') 
                    ? liveMatch.stream_url.replace('watch?v=', 'embed/').split('&')[0] + '?autoplay=1&mute=0' 
                    : liveMatch.stream_url} 
                  title="ECOMIG Live Stream"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900 relative overflow-hidden">
                   <iframe 
                    src="https://www.youtube.com/embed/q_O0K7o962E?autoplay=1&mute=1&controls=0&loop=1&playlist=q_O0K7o962E" 
                    title="Background"
                    className="w-full h-full opacity-10 blur-md scale-110 pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-6 border border-slate-700 shadow-xl">
                      <Tv size={32} className="text-slate-500" />
                    </div>
                    <h2 className="text-xl font-black uppercase tracking-widest mb-2">Signal Offline</h2>
                    <p className="text-slate-500 text-xs font-bold max-w-xs uppercase">No live broadcast detected for the current session. Check upcoming fixtures for the next scheduled stream.</p>
                  </div>
                </div>
              )}
              
              {/* Overlay Controls */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-8 flex flex-col justify-end">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <button className="text-white hover:text-green-400 transition-colors"><Play size={32} fill="currentColor" /></button>
                    <Volume2 size={24} />
                    <span className="font-mono text-sm">74:12 / 90:00</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <Share2 size={20} className="cursor-pointer hover:text-green-400" />
                    <Maximize size={20} className="cursor-pointer hover:text-green-400" />
                  </div>
                </div>
              </div>

              {/* Match Overlay */}
              {liveMatch ? (
                <div className="absolute top-6 left-6 flex items-center gap-4 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-sm uppercase">{liveMatch.teamA}</span>
                    <div className="bg-green-600 px-3 py-1 rounded text-xl font-black font-mono leading-none">
                      {liveMatch.scoreA} - {liveMatch.scoreB}
                    </div>
                    <span className="font-black text-sm uppercase">{liveMatch.teamB}</span>
                  </div>
                  <div className="w-px h-6 bg-white/20 mx-2" />
                  <span className="text-yellow-400 font-black font-mono animate-pulse">{liveMatch.time}</span>
                </div>
              ) : (
                <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
                  <span className="text-white font-black text-xs uppercase tracking-widest">No Live Match Currently</span>
                </div>
              )}
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Possession", a: "54%", b: "46%", icon: Activity },
                { label: "Shots", a: "12", b: "8", icon: TrendingUp },
                { label: "Fouls", a: "4", b: "7", icon: Info },
                { label: "Corners", a: "6", b: "3", icon: Trophy }
              ].map(s => (
                <div key={s.label} className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    <s.icon size={14} className="text-slate-500" />
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{s.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-lg">{s.a}</span>
                    <div className="flex-1 mx-3 h-1 bg-slate-800 rounded-full overflow-hidden flex">
                      <div className="h-full bg-green-500" style={{ width: s.a }} />
                      <div className="h-full bg-slate-700" style={{ width: s.b }} />
                    </div>
                    <span className="font-black text-lg text-slate-500">{s.b}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* CHANNEL INFO */}
            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl">
              <h3 className="text-2xl font-black uppercase italic mb-6">About this Stream</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Broadcast live from the ECOMIG Headquarters Sports Arena. This match is part of the 4th Anniversary Commander's Cup, 
                showcasing the athletic prowess and unity of the ECOWAS Mission in The Gambia. 
                Streaming in Ultra-HD 4K for all mission personnel and families.
              </p>
              <div className="mt-8 flex gap-3">
                <span className="px-4 py-2 bg-slate-800 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-400">#ECOMIGCUP</span>
                <span className="px-4 py-2 bg-slate-800 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-400">#MISSIONPEACE</span>
                <span className="px-4 py-2 bg-slate-800 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-400">#ECOWAS_SPORTS</span>
              </div>
            </div>
          </div>

          {/* SIDEBAR: FIXTURES & STANDINGS */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* FIXTURES */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
                <h4 className="font-black uppercase tracking-tighter text-lg flex items-center gap-2">
                  <Calendar size={18} className="text-green-500" /> Upcoming
                </h4>
                <button className="text-[10px] font-black uppercase text-green-500 hover:underline">View All</button>
              </div>
              <div className="divide-y divide-slate-800">
                {fixtures.map(f => (
                  <div key={f.id} className="p-5 hover:bg-white/5 transition-colors group cursor-pointer">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{format(new Date(f.date), "MMM d")}</span>
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono italic">{f.time}</span>
                    </div>
                    <div className="flex justify-between items-center font-black uppercase group-hover:text-green-400 transition-colors">
                      <span className="text-xs">{f.teamA}</span>
                      <span className="text-slate-700 mx-2 text-[10px]">VS</span>
                      <span className="text-xs text-right">{f.teamB}</span>
                    </div>
                  </div>
                ))}
                {fixtures.length === 0 && <p className="p-8 text-center text-xs text-slate-500 uppercase font-black">No upcoming fixtures</p>}
              </div>
            </div>

            {/* STANDINGS */}
            <div className="bg-[#1a5d3b] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(26,93,59,0.2)]">
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h4 className="font-black uppercase tracking-tighter text-lg flex items-center gap-2">
                  <Trophy size={18} className="text-yellow-400" /> Standings
                </h4>
                <Award size={20} className="opacity-50" />
              </div>
              <div className="p-2">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] uppercase font-black tracking-widest text-white/50 border-b border-white/10">
                      <th className="p-4 text-left">Pos</th>
                      <th className="p-4 text-left">Team</th>
                      <th className="p-4 text-center">GP</th>
                      <th className="p-4 text-center">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                        <td className="p-4 text-xs font-mono font-bold text-white/40">{idx + 1}</td>
                        <td className="p-4 font-black uppercase text-sm tracking-tight">{s.name}</td>
                        <td className="p-4 text-center font-mono font-bold">{s.played}</td>
                        <td className="p-4 text-center bg-white/10 font-bold group-hover:bg-yellow-400 group-hover:text-black transition-all">{s.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-6 text-center">
                  <button className="w-full py-4 border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-[#1a5d3b] transition-all">
                    Full Leaderboard
                  </button>
                </div>
              </div>
            </div>

            {/* AD BANNER / SPONSOR */}
            <div className="relative rounded-3xl overflow-hidden h-40 group cursor-pointer">
              <img 
                src="https://picsum.photos/seed/football_stadium/800/400" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                alt="Sponsor"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent p-8 flex flex-col justify-center">
                <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-[0.35em] mb-1">Official Partner</p>
                <h5 className="text-xl font-black uppercase">ECOWAS Sports Commission</h5>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default FootballTV;
