import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, Package, Clock, Shield, Zap, BarChart3 } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Landing() {
  const navigate = useNavigate();
  const [showLoader, setShowLoader] = useState(true);
  const [fadeLoader, setFadeLoader] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeLoader(true);
    }, 1500);
    const removeTimer = setTimeout(() => {
      setShowLoader(false);
    }, 2000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  const features = [
    {
      icon: Bot,
      title: 'Smart AI Assistant',
      description: 'Chat naturally with your inventory system - ask questions and get instant answers',
    },
    {
      icon: Zap,
      title: 'Instant Barcode Scanning',
      description: 'Scan medicine packages instantly - no manual typing needed',
    },
    {
      icon: Package,
      title: 'Always Up-to-Date',
      description: 'Your inventory syncs automatically across all devices in real-time',
    },
    {
      icon: Clock,
      title: 'Expiry Warnings',
      description: 'Get notified before medicines expire so you never waste stock',
    },
    {
      icon: Shield,
      title: 'Low Stock Alerts',
      description: 'Automatic reminders when it\'s time to reorder popular items',
    },
    {
      icon: BarChart3,
      title: 'Easy Sales Tracking',
      description: 'Log daily sales effortlessly and see your pharmacy\'s performance',
    },
  ];

  const benefits = [
    {
      stat: '⚡',
      label: 'Lightning Fast',
      description: 'Scan barcodes and get results in under a second',
    },
    {
      stat: '🤖',
      label: 'AI-Powered',
      description: 'Smart assistant that understands your pharmacy needs',
    },
    {
      stat: '☁️',
      label: 'Cloud-Based',
      description: 'Access your data anywhere, anytime, from any device',
    },
  ];

  const testimonials = [
    {
      quote: "No more manual entry! I just scan the barcode and everything is logged automatically. Saves me hours every week.",
      author: "Sarah M.",
      role: "Community Pharmacist",
    },
    {
      quote: "The AI assistant is like having an extra team member. It answers questions instantly and catches drug interactions I might miss.",
      author: "Dr. James K.",
      role: "Hospital Pharmacy Director",
    },
    {
      quote: "Expiry alerts have saved us thousands in wasted inventory. The system reminds us before items expire so we can use them first.",
      author: "Maria L.",
      role: "Pharmacy Manager",
    },
  ];

  return (
    <>
      <style>
        {`
          @keyframes spinPill {
            0% { transform: scale(0.2) rotate(0deg); opacity: 0; }
            50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
            100% { transform: scale(1) rotate(360deg); opacity: 1; }
          }
          .animate-spin-pill {
            animation: spinPill 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
          }
          @keyframes scanLaser {
            0% { top: 10%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 90%; opacity: 0; }
          }
        `}
      </style>
      {showLoader && (
        <div 
          className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center px-4 transition-opacity duration-500 ${fadeLoader ? 'opacity-0' : 'opacity-100'}`}
        >
          <div className="w-[80px] sm:w-[100px] md:w-[120px] h-[80px] sm:h-[100px] md:h-[120px] mb-4 sm:mb-5">
            <svg viewBox="0 0 100 100" className="w-full h-full animate-spin-pill">
              <path d="M 25 75 L 75 25 A 20 20 0 0 0 46.7 18.3 L 18.3 46.7 A 20 20 0 0 0 25 75 Z" fill="#FFFFFF" stroke="#16a34a" strokeWidth="4" strokeLinejoin="round"/>
              <path d="M 25 75 L 75 25 A 20 20 0 0 1 81.7 53.3 L 53.3 81.7 A 20 20 0 0 1 25 75 Z" fill="#16a34a" stroke="#16a34a" strokeWidth="4" strokeLinejoin="round"/>
              <line x1="25" y1="75" x2="75" y2="25" stroke="#16a34a" strokeWidth="4" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="font-black text-[28px] sm:text-[36px] md:text-[48px] uppercase text-[#0F172A] tracking-tight text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
            NOVAMED
          </div>
          <div className="text-[14px] sm:text-[16px] md:text-[18px] text-[#64748B] mt-3 sm:mt-4 font-medium tracking-wide text-center">
            AI-Powered Pharmacy Management
          </div>
        </div>
      )}
    <div className="relative min-h-screen bg-[#F8FAFC]">
      {/* Global Graph Paper Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.14] z-0">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, #16a34a 1px, transparent 1px),
            linear-gradient(to bottom, #16a34a 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, #16a34a 1px, transparent 1px),
            linear-gradient(to bottom, #16a34a 1px, transparent 1px)
          `,
          backgroundSize: '12px 12px',
          opacity: 0.3
        }}></div>
      </div>

      {/* Fixed Header */}
      <header className="sticky top-0 w-full border-b border-[#0F172A] bg-white z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span 
              className="text-[#0F172A] text-[14px] sm:text-[20px] font-black uppercase tracking-tight"
              style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.5px' }}
            >
              NOVAMED
            </span>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-3 sm:px-6 py-2 sm:py-2.5 text-[11px] sm:text-[13px] font-bold text-[#0F172A] hover:bg-[#F8FAFC] transition-all border border-[#0F172A]"
              style={{ borderRadius: '999px' }}
            >
              LOG IN
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-3 sm:px-6 py-2 sm:py-2.5 text-[11px] sm:text-[13px] font-black text-white bg-[#16a34a] hover:bg-[#15803d] transition-all border border-[#0F172A]"
              style={{ borderRadius: '999px' }}
            >
              SIGN UP
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-8 py-12 sm:py-24 overflow-hidden">
        <div className="relative max-w-6xl mx-auto z-10">
          <div className="text-center mb-8 sm:mb-16">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-[#0F172A] mb-6 sm:mb-8"
              style={{ borderRadius: '999px' }}
            >
              <div className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#16a34a]">
                AI-Powered Pharmacy Management
              </span>
            </div>

            {/* Main Heading */}
            <h1 
              className="text-[36px] sm:text-[56px] lg:text-[72px] font-black uppercase text-[#0F172A] tracking-tight mb-4 sm:mb-6 leading-none px-4"
              style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, letterSpacing: '-0.03em' }}
            >
              INVENTORY THAT
              <br />
              <span className="text-[#16a34a]">THINKS AHEAD</span>
            </h1>

            {/* Subheading */}
            <p className="text-[16px] sm:text-[20px] text-[#64748B] font-medium mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-4">
              From scanning a barcode to catching a drug interaction — NovaMed handles the complexity so you can focus on care.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12 sm:mb-20 px-4">
              <button
                onClick={() => navigate('/signup')}
                className="w-full sm:w-auto group px-8 sm:px-10 py-4 sm:py-5 text-[13px] sm:text-[15px] font-black text-white bg-[#16a34a] hover:bg-[#15803d] transition-all border border-[#0F172A] flex items-center justify-center gap-2"
                style={{ borderRadius: '999px' }}
              >
                GET STARTED FREE
                <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 text-[13px] sm:text-[15px] font-black text-[#0F172A] bg-white hover:bg-[#F8FAFC] transition-all border border-[#0F172A]"
                style={{ borderRadius: '999px' }}
              >
                SIGN IN
              </button>
            </div>
          </div>

          {/* Hero Barcode Scanner Mockup */}
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-[#0F172A] shadow-2xl mx-2 sm:mx-4 bg-white h-[350px] sm:h-[450px] flex flex-col font-mono">
            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-[#0F172A] bg-[#F8FAFC]">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-[#16a34a] flex items-center justify-center border border-[#0F172A]">
                  <Zap className="w-3 sm:w-4 h-3 sm:h-4 text-white" />
                </div>
                <span className="text-[#0F172A] font-black tracking-widest text-[10px] sm:text-[13px] uppercase">GS1-128 Live Decoder</span>
              </div>
              <div className="flex gap-1.5 sm:gap-2">
                <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-red-500 border border-[#0F172A]"></div>
                <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-yellow-500 border border-[#0F172A]"></div>
                <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-[#16a34a] border border-[#0F172A]"></div>
              </div>
            </div>

            {/* Scanner Body */}
            <div className="flex-1 p-4 sm:p-8 flex items-center justify-center relative overflow-hidden">
              {/* Animated Background Grid */}
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(22,163,74,0.15) 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
              
              {/* Barcode Element */}
              <div className="relative bg-white p-4 sm:p-8 px-5 sm:px-10 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-[#0F172A] shadow-[0_10px_40px_rgba(22,163,74,0.2)] transform hover:scale-105 transition-transform duration-500 z-10">
                {/* Barcode lines */}
                <div className="flex gap-[2px] sm:gap-[3px] h-20 sm:h-36 items-end justify-center">
                  <div className="w-1 sm:w-1.5 h-full bg-[#0F172A]"></div>
                  <div className="w-2 sm:w-3 h-full bg-[#0F172A]"></div>
                  <div className="w-0.5 sm:w-1 h-full bg-[#0F172A]"></div>
                  <div className="w-2.5 sm:w-4 h-full bg-[#0F172A]"></div>
                  <div className="w-1 sm:w-1.5 h-full bg-[#0F172A]"></div>
                  <div className="w-2 sm:w-3 h-full bg-[#0F172A]"></div>
                  <div className="w-3 sm:w-5 h-full bg-[#0F172A]"></div>
                  <div className="w-1 sm:w-1.5 h-full bg-[#0F172A]"></div>
                  <div className="w-2 sm:w-3 h-full bg-[#0F172A]"></div>
                  <div className="w-0.5 sm:w-1 h-full bg-[#0F172A]"></div>
                  <div className="w-2.5 sm:w-4 h-full bg-[#0F172A]"></div>
                  <div className="w-0.5 sm:w-1 h-full bg-[#0F172A]"></div>
                  <div className="w-3 sm:w-5 h-full bg-[#0F172A]"></div>
                  <div className="w-1.5 sm:w-2 h-full bg-[#0F172A]"></div>
                  <div className="w-2 sm:w-3 h-full bg-[#0F172A]"></div>
                  <div className="w-1 sm:w-1.5 h-full bg-[#0F172A]"></div>
                  <div className="w-2.5 sm:w-4 h-full bg-[#0F172A]"></div>
                </div>
                {/* Text below barcode */}
                <div className="mt-2 sm:mt-4 text-center text-[#0F172A] font-black text-[9px] sm:text-[13px] tracking-widest font-sans">
                  (01) 103102283021 (17) 251231 (10) X79813
                </div>

                {/* Animated Laser */}
                <div 
                  className="absolute left-0 right-0 h-[3px] sm:h-[4px] bg-[#16a34a] shadow-[0_0_20px_4px_rgba(22,163,74,0.6)] z-20"
                  style={{ animation: 'scanLaser 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate' }}
                ></div>
                
                {/* Scanning Frame brackets */}
                <div className="absolute -top-2 sm:-top-3 -left-2 sm:-left-3 w-6 sm:w-8 h-6 sm:h-8 border-t-2 sm:border-t-4 border-l-2 sm:border-l-4 border-[#16a34a] rounded-tl-xl"></div>
                <div className="absolute -top-2 sm:-top-3 -right-2 sm:-right-3 w-6 sm:w-8 h-6 sm:h-8 border-t-2 sm:border-t-4 border-r-2 sm:border-r-4 border-[#16a34a] rounded-tr-xl"></div>
                <div className="absolute -bottom-2 sm:-bottom-3 -left-2 sm:-left-3 w-6 sm:w-8 h-6 sm:h-8 border-b-2 sm:border-b-4 border-l-2 sm:border-l-4 border-[#16a34a] rounded-bl-xl"></div>
                <div className="absolute -bottom-2 sm:-bottom-3 -right-2 sm:-right-3 w-6 sm:w-8 h-6 sm:h-8 border-b-2 sm:border-b-4 border-r-2 sm:border-r-4 border-[#16a34a] rounded-br-xl"></div>
              </div>
            </div>

            {/* Readout Panel */}
            <div className="p-3 sm:p-6 bg-[#F8FAFC] border-t border-[#0F172A] grid grid-cols-3 gap-2 sm:gap-6">
              <div className="bg-white border border-[#0F172A] rounded-xl sm:rounded-2xl p-2 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-[#16a34a] text-[9px] sm:text-[11px] font-black tracking-widest mb-0.5 sm:mb-1">GTIN / NDC</div>
                <div className="text-[#0F172A] text-[11px] sm:text-[16px] font-black font-sans">103102283021</div>
              </div>
              <div className="bg-white border border-[#0F172A] rounded-xl sm:rounded-2xl p-2 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-[#16a34a] text-[9px] sm:text-[11px] font-black tracking-widest mb-0.5 sm:mb-1">EXPIRY</div>
                <div className="text-[#0F172A] text-[11px] sm:text-[16px] font-black font-sans">DEC 31, 2025</div>
              </div>
              <div className="bg-white border border-[#0F172A] rounded-xl sm:rounded-2xl p-2 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-[#16a34a] text-[9px] sm:text-[11px] font-black tracking-widest mb-0.5 sm:mb-1">LOT NUMBER</div>
                <div className="text-[#0F172A] text-[11px] sm:text-[16px] font-black font-sans">X79813</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 sm:px-8 py-12 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-[32px] sm:text-[48px] font-black uppercase text-[#0F172A] mb-3 sm:mb-4 tracking-tight">
              EVERYTHING YOU NEED
            </h2>
            <p className="text-[16px] sm:text-[18px] text-[#64748B] max-w-2xl mx-auto px-4">
              Powerful features designed specifically for modern pharmacy operations
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group bg-white border border-[#0F172A] rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-left hover:bg-[#F0FDF4] hover:shadow-lg transition-all"
              >
                <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-full bg-[#16a34a] border border-[#0F172A] flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 sm:w-7 h-6 sm:h-7 text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-[14px] sm:text-[16px] font-black uppercase text-[#0F172A] mb-2 sm:mb-3 tracking-wide">
                  {feature.title}
                </h3>
                <p className="text-[13px] sm:text-[14px] text-[#64748B] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-4 sm:px-8 py-12 sm:py-24 bg-[#16a34a] border-y border-[#0F172A]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-[32px] sm:text-[48px] font-black uppercase mb-3 sm:mb-4 tracking-tight text-white">
              CORE TECHNOLOGIES
            </h2>
            <p className="text-[16px] sm:text-[18px] text-white/80 max-w-2xl mx-auto px-4">
              A modern stack tailored for speed, accuracy, and AI capabilities
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-12">
            {benefits.map((benefit) => (
              <div key={benefit.label} className="text-center bg-white border border-[#0F172A] rounded-2xl sm:rounded-3xl p-6 sm:p-8">
                <div className="text-[48px] sm:text-[64px] font-black text-[#0F172A] mb-1 sm:mb-2 leading-none">
                  {benefit.stat}
                </div>
                <div className="text-[16px] sm:text-[20px] font-bold mb-2 sm:mb-3 text-[#0F172A]">
                  {benefit.label}
                </div>
                <p className="text-[13px] sm:text-[14px] text-[#64748B] leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 sm:px-8 py-12 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-[32px] sm:text-[48px] font-black uppercase text-[#0F172A] mb-3 sm:mb-4 tracking-tight">
              HOW IT WORKS
            </h2>
            <p className="text-[16px] sm:text-[18px] text-[#64748B] max-w-2xl mx-auto px-4">
              Get started in minutes, not hours
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
            {[
              {
                step: '01',
                title: 'Sign Up Securely',
                description: 'Create your account with secure authentication - your data stays private and protected.',
              },
              {
                step: '02',
                title: 'Scan & Add Items',
                description: 'Point your camera at any medicine barcode to instantly add it to your inventory.',
              },
              {
                step: '03',
                title: 'Ask Questions',
                description: "Chat naturally with the AI assistant - 'Do we have Amoxicillin?' or 'What expires soon?'",
              },
            ].map((item) => (
              <div key={item.step} className="relative bg-white border border-[#0F172A] rounded-2xl sm:rounded-3xl p-6 sm:p-8">
                <div className="text-[56px] sm:text-[72px] font-black text-[#16a34a]/20 leading-none mb-3 sm:mb-4">
                  {item.step}
                </div>
                <h3 className="text-[16px] sm:text-[20px] font-black uppercase text-[#0F172A] mb-2 sm:mb-3">
                  {item.title}
                </h3>
                <p className="text-[13px] sm:text-[14px] text-[#64748B] leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="px-4 sm:px-8 py-12 sm:py-24 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-[32px] sm:text-[48px] font-black uppercase text-[#0F172A] mb-3 sm:mb-4 tracking-tight">
              WHY PHARMACIES LOVE IT
            </h2>
            <p className="text-[16px] sm:text-[18px] text-[#64748B] max-w-2xl mx-auto px-4">
              Built for real pharmacy workflows
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
            {testimonials.map((testimonial, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#0F172A] rounded-2xl sm:rounded-3xl p-6 sm:p-8 hover:bg-[#F0FDF4] hover:shadow-lg transition-all"
              >
                <div className="flex gap-1 mb-4 sm:mb-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-4 sm:w-5 h-4 sm:h-5 rounded-full bg-[#16a34a]" />
                  ))}
                </div>
                <p className="text-[13px] sm:text-[15px] text-[#0F172A] leading-relaxed mb-4 sm:mb-6 font-medium">
                  "{testimonial.quote}"
                </p>
                <div className="border-t border-[#0F172A] pt-3 sm:pt-4">
                  <p className="text-[13px] sm:text-[14px] font-black text-[#0F172A]">
                    {testimonial.author}
                  </p>
                  <p className="text-[11px] sm:text-[12px] text-[#64748B] mt-1">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-8 py-12 sm:py-24 bg-gradient-to-br from-[#16a34a] to-[#15803d] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[36px] sm:text-[48px] lg:text-[56px] font-black uppercase mb-4 sm:mb-6 tracking-tight leading-none">
            READY TO EXPLORE
            <br />
            NOVAMED?
          </h2>
          <p className="text-[16px] sm:text-[20px] text-white/90 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-4">
            Join pharmacies already using NovaMed to save time and reduce errors.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
            <button
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto group px-10 sm:px-12 py-4 sm:py-5 text-[13px] sm:text-[15px] font-black text-[#16a34a] bg-white hover:bg-gray-50 transition-all shadow-2xl flex items-center justify-center gap-2"
              style={{ borderRadius: '999px' }}
            >
              START FREE TRIAL
              <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
            </button>
          </div>
          <p className="text-[12px] sm:text-[13px] text-white/70 mt-4 sm:mt-6 px-4">
            Secure cloud storage • Works on any device • No credit card required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-[#E2E8F0] bg-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12 mb-8 sm:mb-12">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <span className="text-[#0F172A] text-[14px] sm:text-[18px] font-black uppercase tracking-tight">
                  NOVAMED
                </span>
              </div>
              <p className="text-[12px] sm:text-[13px] text-[#64748B] leading-relaxed">
                AI-powered pharmacy management for the modern era.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-[11px] sm:text-[12px] font-black uppercase text-[#0F172A] mb-3 sm:mb-4 tracking-wider">
                PRODUCT
              </h4>
              <ul className="space-y-1.5 sm:space-y-2">
                {['Features', 'Pricing', 'Security', 'Roadmap'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-[12px] sm:text-[13px] text-[#64748B] hover:text-[#0F172A] transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-[11px] sm:text-[12px] font-black uppercase text-[#0F172A] mb-3 sm:mb-4 tracking-wider">
                COMPANY
              </h4>
              <ul className="space-y-1.5 sm:space-y-2">
                {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-[12px] sm:text-[13px] text-[#64748B] hover:text-[#0F172A] transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-[11px] sm:text-[12px] font-black uppercase text-[#0F172A] mb-3 sm:mb-4 tracking-wider">
                LEGAL
              </h4>
              <ul className="space-y-1.5 sm:space-y-2">
                {['Privacy', 'Terms', 'Compliance', 'Licenses'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-[12px] sm:text-[13px] text-[#64748B] hover:text-[#0F172A] transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-[#E2E8F0] pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] sm:text-[12px] text-[#94A3B8] font-medium text-center sm:text-left">
              © 2026 NovaMed. All rights reserved.
            </p>
            <div className="flex items-center gap-4 sm:gap-6">
              <a href="#" className="text-[#64748B] hover:text-[#0F172A] transition-colors">
                <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
              </a>
              <a href="#" className="text-[#64748B] hover:text-[#0F172A] transition-colors">
                <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" /></svg>
              </a>
              <a href="#" className="text-[#64748B] hover:text-[#0F172A] transition-colors">
                <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
