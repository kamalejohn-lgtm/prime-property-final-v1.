import React, { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Menu, X, MapPin, Phone, Mail, Instagram, Facebook, 
  MessageSquare, ChevronRight, Home, Building2, Paintbrush, 
  Trash2, Car, Search, Users, ArrowRight, Star, Send
} from "lucide-react";
import { Toaster, toast } from "sonner";

import Admin from './components/Admin';
import AdBanner from './components/AdBanner';
import { db } from './firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { useProperties } from './hooks/useProperties';

// --- TYPES ---
interface Property {
  id: string;
  title: string;
  type: string;
  location: string;
  price: string;
  image: string;
  features: string[];
}

interface Service {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
}

// --- MOCK DATA ---
const PROPERTIES: Property[] = [
  {
    id: "1",
    title: "3 Bedroom Apartment",
    type: "Apartment",
    location: "Lekki Phase 1, Lagos",
    price: "180 Million Naira",
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=2070&auto=format&fit=crop",
    features: ["3 Bedrooms", "4 Bathrooms", "Elevator"]
  },
  {
    id: "2",
    title: "Luxury 3 Bedroom Maisonette",
    type: "Maisonette",
    location: "Lekki Foreshore",
    price: "280 Million Naira",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop",
    features: ["3 Bedrooms", "Gym", "Ocean View"]
  },
  {
    id: "3",
    title: "Penthouse Exclusivity",
    type: "Penthouse",
    location: "Maitama, Abuja",
    price: "450 Million Naira",
    image: "https://images.unsplash.com/photo-1600607687940-4e2303b9c1d1?q=80&w=2070&auto=format&fit=crop",
    features: ["4 Bedrooms", "Swimming Pool", "Automation"]
  }
];

const SERVICES: Service[] = [
  {
    id: "1",
    title: "Property Sales & Management",
    description: "Expert management and sales strategies for high-value assets.",
    icon: <Building2 className="w-8 h-8 text-gold" />
  },
  {
    id: "2",
    title: "Property Procurement",
    description: "Sourcing specific properties that match your lifestyle and investment goals.",
    icon: <Search className="w-8 h-8 text-gold" />
  },
  {
    id: "3",
    title: "Interior Decoration",
    description: "Transforming spaces into luxury living experiences.",
    icon: <Paintbrush className="w-8 h-8 text-gold" />
  },
  {
    id: "4",
    title: "Cleaning Services",
    description: "Professional cleaning solutions for pristine environments.",
    icon: <Trash2 className="w-8 h-8 text-gold" />
  },
  {
    id: "5",
    title: "Luxury Car Rentals",
    description: "A fleet of premium vehicles for your mobility needs.",
    icon: <Car className="w-8 h-8 text-gold" />
  }
];

const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    name: "Olakunle Benson",
    role: "Property Owner",
    content: "PrimeProperty Partners helped me find my dream home effortlessly! Their attention to detail is unmatched."
  },
  {
    id: "2",
    name: "Sarah Adams",
    role: "Investor",
    content: "The level of professionalism in property procurement is top-notch. Highly recommended for serious investors."
  }
];

// --- COMPONENTS ---
const Logo = ({ className = "" }: { className?: string }) => (
  <Link to="/" className={`flex flex-col items-center group ${className}`}>
    <div className="relative flex flex-col items-center">
      {/* House Roof SVG */}
      <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gold mb-1">
        <path d="M2 18V10L20 2L38 10V18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {/* Logo Text Box */}
      <div className="bg-[#fdf5e6] px-3 py-1 rounded-sm shadow-sm">
        <span className="font-serif text-[14px] md:text-base text-[#b8860b] font-bold tracking-tight uppercase leading-none block">
          PRIMEPROPERTY
        </span>
      </div>
      <span className="text-gold text-[10px] md:text-[11px] tracking-[0.3em] uppercase font-bold mt-1">
        PARTNERS
      </span>
    </div>
  </Link>
);

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();

  const links = [
    { name: "Home", path: "/" },
    { name: "About Us", path: "/about" },
    { name: "Properties", path: "/properties" },
    { name: "Services", path: "/services" },
    { name: "Recruitment", path: "/recruitment" },
    { name: "Contact", path: "/contact" },
    { name: "Admin", path: "/admin" },
  ];

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
        <Logo />

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link key={link.path} to={link.path} className={`nav-link ${pathname === link.path ? "text-gold" : ""}`}>
              {link.name}
            </Link>
          ))}
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-white hover:text-gold transition-colors">
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="md:hidden absolute top-20 left-0 right-0 bg-black border-t border-white/10 p-10 flex flex-col gap-6 h-screen"
          >
            {links.map((link) => (
              <Link 
                key={link.path} 
                to={link.path} 
                className={`text-2xl font-serif tracking-wide uppercase ${pathname === link.path ? "text-gold" : "text-white"}`}
              >
                {link.name}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Footer = () => {
  return (
    <footer className="bg-[#050505] border-t border-white/5 py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <Logo className="!items-start mb-6" />
            <p className="text-white/50 text-sm max-w-sm mb-6">
              PrimeProperty Partners is a trusted luxury real estate and property solutions company dedicated to delivering luxury, comfort, and value.
            </p>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/johntarigrace" target="_blank" rel="noreferrer" className="w-10 h-10 border border-white/10 flex items-center justify-center rounded-full text-white hover:border-gold hover:text-gold transition-all">
                <Instagram size={18} />
              </a>
              <a href="#" className="w-10 h-10 border border-white/10 flex items-center justify-center rounded-full text-white hover:border-gold hover:text-gold transition-all">
                <Facebook size={18} />
              </a>
              <a href="https://wa.me/2349110034080" className="w-10 h-10 border border-white/10 flex items-center justify-center rounded-full text-white hover:border-gold hover:text-gold transition-all">
                <MessageSquare size={18} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-gold uppercase tracking-widest text-xs font-bold mb-6">Quick Links</h4>
            <ul className="space-y-4">
              <li><Link to="/about" className="text-white/60 hover:text-gold text-sm transition-colors">About Us</Link></li>
              <li><Link to="/properties" className="text-white/60 hover:text-gold text-sm transition-colors">Properties</Link></li>
              <li><Link to="/services" className="text-white/60 hover:text-gold text-sm transition-colors">Services</Link></li>
              <li><Link to="/admin" className="text-white/60 hover:text-gold text-sm transition-colors">Admin Portal</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-gold uppercase tracking-widest text-xs font-bold mb-6">Legal</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-white/60 hover:text-gold text-sm transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-white/60 hover:text-gold text-sm transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/30 text-xs uppercase tracking-widest">&copy; 2026 PrimeProperty Partners. All rights reserved.</p>
          <p className="text-white/30 text-xs uppercase tracking-widest">Your Trusted Partner in Luxury Real Estate</p>
        </div>
      </div>
    </footer>
  );
};

// --- SECTIONS ---

const Hero = () => {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Parallax effect */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop" 
          alt="Luxury Penthouse" 
          className="w-full h-full object-cover opacity-30 mix-blend-overlay scale-105" 
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="inline-block text-gold uppercase tracking-[0.4em] text-sm font-semibold mb-6">
            Premier Property Solutions
          </span>
          <h1 className="font-serif text-6xl md:text-8xl text-white mb-8 leading-none">
            Luxury Living, <br />
            <span className="gold-gradient-text italic">Smart Investments</span>
          </h1>
          <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-light leading-relaxed">
            We connect you to premium properties, trusted services, and profitable opportunities tailored to meet modern living standards.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/properties" className="btn-gold group flex items-center gap-2">
              View Properties <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/recruitment" className="btn-outline-gold">
              Join Our Team
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div 
        animate={{ y: [0, 10, 0] }} 
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/30 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] uppercase tracking-widest">Scroll</span>
        <div className="w-[1px] h-12 bg-white/20" />
      </motion.div>
    </section>
  );
};

const AboutSection = () => {
  return (
    <section className="py-32 bg-transparent overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
             initial={{ opacity: 0, x: -50 }}
             whileInView={{ opacity: 1, x: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.8 }}
          >
            <span className="text-gold uppercase tracking-widest text-xs font-bold mb-4 block">Our Story</span>
            <h2 className="section-heading">Who We Are</h2>
            <p className="text-white/60 text-lg leading-relaxed mb-8">
              PrimeProperty Partners is a trusted real estate and property solutions company dedicated to delivering luxury, comfort, and value. 
            </p>
            <p className="text-white/60 text-lg leading-relaxed mb-10">
              We specialize in property sales, procurement, and lifestyle services tailored to meet modern living standards. Our approach is built on trust, excellence, and a deep understanding of the high-end market.
            </p>
            <Link to="/about" className="inline-flex items-center gap-4 text-gold font-bold uppercase tracking-widest text-sm group">
              READ FULL STORY 
              <div className="h-[1px] w-8 bg-gold transition-all group-hover:w-16" />
            </Link>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="relative"
          >
            <img 
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop" 
              alt="Architecture" 
              className="w-full aspect-[4/5] object-cover grayscale brightness-75" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 border border-gold/30 -z-10 hidden md:block" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const FeaturedProperties = () => {
  const { properties, loading } = useProperties(6);
  const displayProperties = properties.length > 0 ? properties : PROPERTIES;

  return (
    <section className="py-32 bg-black/20 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <div>
            <span className="text-gold uppercase tracking-widest text-xs font-bold mb-4 block">Exclusive Selections</span>
            <h2 className="section-heading mb-0">Featured Listings</h2>
          </div>
          <Link to="/properties" className="btn-outline-gold py-2 text-xs">View All Inventory</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {displayProperties.map((prop, index) => (
            <motion.div 
              key={prop.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="property-card group"
            >
              <div className="relative overflow-hidden aspect-[4/3]">
                <img 
                  src={prop.image} 
                  alt={prop.title} 
                  className="w-full h-full object-cover scale-100 group-hover:scale-110 transition-transform duration-700" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1 border border-white/10">
                   <span className="text-[10px] text-gold uppercase tracking-widest font-bold">{prop.type}</span>
                </div>
              </div>
              <div className="p-8">
                <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-widest mb-3">
                  <MapPin size={14} className="text-gold" /> {prop.location}
                </div>
                <h3 className="font-serif text-2xl text-white mb-4">{prop.title}</h3>
                <div className="flex gap-4 mb-8">
                  {prop.features.map(f => (
                    <span key={f} className="text-[10px] text-white/50 border border-white/5 px-2 py-1 uppercase">{f}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <span className="text-gold font-bold text-lg">{prop.price}</span>
                  <Link to={`/properties/${prop.id}`} className="text-white hover:text-gold transition-colors">
                    <ArrowRight size={20} />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const ServicesSection = () => {
  return (
    <section className="py-32 bg-transparent border-y border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-24">
          <span className="text-gold uppercase tracking-widest text-xs font-bold mb-4 block">Expertise</span>
          <h2 className="section-heading">What We Offer</h2>
          <p className="text-white/50 max-w-2xl mx-auto font-light">
            From premium homes to professional property services, PrimeProperty Partners delivers excellence, comfort, and value every step of the way.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {SERVICES.map((service, index) => (
            <motion.div 
              key={service.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="service-card"
            >
              <div className="mb-8">{service.icon}</div>
              <h3 className="font-serif text-2xl text-white mb-4">{service.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed mb-8">{service.description}</p>
              <Link to="/services" className="text-xs text-gold font-bold uppercase tracking-widest inline-flex items-center gap-2 group">
                LEARN MORE <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const RecruitmentSection = () => {
  const roles = [
    "Interior Decorators",
    "Sales Representatives",
    "Cleaning Services",
    "Property Procurement Agents",
    "Drivers"
  ];

  return (
    <section className="py-32 bg-black/20 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gold/5 -skew-x-12 translate-x-1/2" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <span className="text-gold uppercase tracking-widest text-xs font-bold mb-4 block">Careers</span>
            <h2 className="section-heading">Build Your Career <br /><span className="gold-gradient-text">With Us</span></h2>
            <p className="text-white/60 mb-10 text-lg leading-relaxed">
              We are expanding and looking for passionate professionals to join our growing team. Experience the excellence of working in luxury real estate.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
              {roles.map(role => (
                <li key={role} className="flex items-center gap-3 text-white/80 font-medium">
                  <div className="w-1.5 h-1.5 bg-gold rounded-full" />
                  {role}
                </li>
              ))}
            </ul>
            <div className="bg-white/5 border border-white/10 p-8 rounded-sm">
              <p className="text-gold font-bold uppercase tracking-widest text-[10px] mb-4">Application Contact</p>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Phone className="text-gold" size={20} />
                  <span className="text-xl font-medium">+234 911 003 4080</span>
                </div>
                <div className="flex items-center gap-4">
                  <Instagram className="text-gold" size={20} />
                  <span className="text-white/60">DM social link via Instagram</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-[#111111] p-12 border border-white/10 shadow-2xl">
            <h3 className="font-serif text-3xl mb-8">Quick Inquiry</h3>
            <form className="space-y-6">
              <input type="text" placeholder="Full Name" className="input-field" />
              <input type="email" placeholder="Email Address" className="input-field" />
              <select className="input-field appearance-none">
                <option>Position of Interest</option>
                {roles.map(r => <option key={r}>{r}</option>)}
              </select>
              <textarea placeholder="Portfolio Link or Message" rows={4} className="input-field resize-none"></textarea>
              <button className="btn-gold w-full flex items-center justify-center gap-3">
                SUBMIT INTEREST <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

const TestimonialsSection = () => {
  return (
    <section className="py-32 bg-transparent border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <span className="text-gold uppercase tracking-widest text-xs font-bold mb-4 block">Philosophy</span>
        <h2 className="section-heading">What Our Clients Say</h2>
        
        <div className="max-w-4xl mx-auto relative mt-20">
          <div className="absolute -top-10 left-0 text-white/5 font-serif text-[150px] leading-none opacity-25">“</div>
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="relative z-10"
          >
             <p className="font-serif text-3xl md:text-5xl text-white/90 leading-tight italic mb-10">
               “{TESTIMONIALS[0].content}”
             </p>
             <div className="h-0.5 w-16 bg-gold mx-auto mb-8" />
             <h4 className="font-serif text-2xl text-gold">{TESTIMONIALS[0].name}</h4>
             <span className="text-white/40 text-xs uppercase tracking-widest">{TESTIMONIALS[0].role}</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const ContactSection = () => {
  return (
    <section className="py-32 bg-transparent">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div>
            <span className="text-gold uppercase tracking-widest text-xs font-bold mb-4 block">Get In Touch</span>
            <h2 className="section-heading">Contact Us</h2>
            <p className="text-white/50 mb-12 max-w-md">
              Whether you're looking for a new home or listing a property, our expert team is here to guide you every step of the way.
            </p>
            
            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="w-14 h-14 bg-white/5 border border-white/10 flex items-center justify-center text-gold">
                  <MapPin size={24} />
                </div>
                <div>
                   <h4 className="text-xs text-gold font-bold uppercase tracking-widest mb-2">Office Location</h4>
                   <p className="text-white/80 font-medium">Victoria Island / Lekki, Lagos, Nigeria</p>
                   <p className="text-white/40 text-sm">Abuja Corporate Office coming soon.</p>
                </div>
              </div>
              
              <div className="flex gap-6">
                <div className="w-14 h-14 bg-white/5 border border-white/10 flex items-center justify-center text-gold">
                  <Phone size={24} />
                </div>
                <div>
                   <h4 className="text-xs text-gold font-bold uppercase tracking-widest mb-2">Phone Support</h4>
                   <p className="text-white/80 font-medium">+234 911 003 4080</p>
                   <p className="text-white/40 text-sm">Available Mon — Sat, 9am — 6pm</p>
                </div>
              </div>
              
              <div className="flex gap-6">
                <div className="w-14 h-14 bg-white/5 border border-white/10 flex items-center justify-center text-gold">
                  <Mail size={24} />
                </div>
                <div>
                   <h4 className="text-xs text-gold font-bold uppercase tracking-widest mb-2">Email Address</h4>
                   <p className="text-white/80 font-medium">info@primeproperty.com</p>
                   <p className="text-white/40 text-sm">General inquiries & support</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-[#0a0a0a] p-10 md:p-16 border border-white/10">
            <form className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2 block">Name</label>
                  <input type="text" className="input-field" placeholder="John Doe" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2 block">Email</label>
                  <input type="email" className="input-field" placeholder="john@example.com" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2 block">Message</label>
                <textarea rows={6} className="input-field resize-none" placeholder="How can we help you reach your property goals?"></textarea>
              </div>
              <button className="btn-gold w-full group flex items-center justify-center gap-3">
                SEND MESSAGE <Send size={18} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- PAGES ---

const HomePage = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-navy"
    >
      <Hero />
      <AboutSection />
      <FeaturedProperties />
      <ServicesSection />
      <RecruitmentSection />
      <TestimonialsSection />
      <ContactSection />
    </motion.div>
  );
};

const AboutPage = () => {
  return (
    <div className="pt-40 pb-32">
      <div className="max-w-7xl mx-auto px-6">
        <h1 className="section-heading mb-12">Premier Living, <br />Trusted Partners</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div className="prose prose-invert prose-lg text-white/70">
            <p>
              PrimeProperty Partners is a trusted real estate and property solutions company dedicated to delivering luxury, comfort, and value. We specialize in property sales, procurement, and lifestyle services tailored to meet modern living standards.
            </p>
            <p>
              Our team consists of industry veterans and creative professionals who believe that finding a home should be an inspiring journey, not just a transaction. Whether you are looking to invest in high-yield assets or find a sanctuary for your family, we provide the expertise needed to navigate the premium market.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="aspect-square bg-white/5 border border-white/10 flex flex-col items-center justify-center p-8">
               <span className="text-4xl text-gold font-serif mb-2">10+</span>
               <span className="text-[10px] uppercase tracking-widest text-white/40 text-center">Years of Expertise</span>
             </div>
             <div className="aspect-square bg-white/5 border border-white/10 flex flex-col items-center justify-center p-8">
               <span className="text-4xl text-gold font-serif mb-2">500+</span>
               <span className="text-[10px] uppercase tracking-widest text-white/40 text-center">Properties Sold</span>
             </div>
             <div className="aspect-square bg-white/5 border border-white/10 flex flex-col items-center justify-center p-8">
               <span className="text-4xl text-gold font-serif mb-2">1k+</span>
               <span className="text-[10px] uppercase tracking-widest text-white/40 text-center">Happy Clients</span>
             </div>
             <div className="aspect-square bg-white/5 border border-white/10 flex flex-col items-center justify-center p-8 transition-colors hover:bg-gold/10">
               <Star className="text-gold mb-3" size={32} />
               <span className="text-[10px] uppercase tracking-widest text-white/40 text-center">Award Winning</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PropertiesPage = () => {
  const { properties, loading } = useProperties();
  const displayProperties = properties.length > 0 ? properties : [...PROPERTIES, ...PROPERTIES];

  return (
    <div className="pt-40 pb-32">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="section-heading">Browse Properties</h2>
        <div className="flex gap-4 mb-12 flex-wrap">
          {["All", "Lagos", "Abuja", "Apartment", "Penthouse", "Maisonette"].map(filter => (
             <button key={filter} className="px-6 py-2 border border-white/10 text-[10px] uppercase tracking-widest hover:border-gold hover:text-gold transition-all">{filter}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {displayProperties.map((prop, index) => (
            <div key={prop.id || index} className="property-card group">
              <div className="relative overflow-hidden aspect-[4/3]">
                <img src={prop.image} alt={prop.title} className="w-full h-full object-cover grayscale brightness-75 hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
              </div>
              <div className="p-8">
                 <h3 className="font-serif text-2xl mb-2">{prop.title}</h3>
                 <p className="text-gold font-bold mb-4">{prop.price}</p>
                 <Link to="/contact" className="btn-outline-gold py-2 text-[10px] w-full text-center block">Request Viewing</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ServicesPage = () => {
  return (
    <div className="pt-40 pb-32">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="section-heading">Our Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {SERVICES.map(s => (
            <div key={s.id} className="bg-[#111111] p-12 border border-white/10">
              <div className="mb-8">{s.icon}</div>
              <h3 className="font-serif text-3xl mb-6">{s.title}</h3>
              <p className="text-white/60 leading-relaxed italic border-l-2 border-gold pl-6">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const RecruitmentPage = () => {
    return (
      <div className="pt-40">
        <RecruitmentSection />
      </div>
    );
}

const ContactPage = () => {
    return (
      <div className="pt-40">
        <ContactSection />
      </div>
    );
}

// --- MAIN APP ---
export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen relative">
        <Navbar />
        
        <main>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/recruitment" element={<RecruitmentPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </AnimatePresence>
        </main>

        <Footer />
        <AdBanner />
        <Toaster position="top-right" theme="dark" richColors />
      </div>
    </BrowserRouter>
  );
}
