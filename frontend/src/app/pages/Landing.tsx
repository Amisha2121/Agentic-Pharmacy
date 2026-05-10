import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, Package, Clock, Shield, Zap, BarChart3 } from 'lucide-react';

export function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Bot,
      title: 'AI Assistant',
      description: 'Natural language queries for inventory, interactions, and more',
    },
    {
      icon: Package,
      title: 'Smart Inventory',
      description: 'Real-time tracking with automated reorder alerts',
    },
    {
      icon: Clock,
      title: 'Expiry Management',
      description: 'Never miss expiration dates with intelligent monitoring',
    },
    {
      icon: Shield,
      title: 'Drug Interactions',
      description: 'Instant safety checks across your entire inventory',
    },
    {
      icon: Zap,
      title: 'Barcode Scanning',
      description: 'Quick product identification and batch tracking',
    },
    {
      icon: BarChart3,
      title: 'Sales Analytics',
      description: 'Track daily sales and inventory trends',
    },
  ];

  const benefits = [
    {
      stat: '10x',
      label: 'Faster inventory checks',
      description: 'AI-powered search finds any product in milliseconds',
    },
    {
      stat: '99.9%',
      label: 'Accuracy rate',
      description: 'Automated tracking eliminates manual entry errors',
    },
    {
      stat: '24/7',
      label: 'Real-time monitoring',
      description: 'Never miss a critical alert or expiration date',
    },
  ];

  const testimonials = [
    {
      quote: "PharmaAI transformed how we manage inventory. The AI assistant saves us hours every day.",
      author: "Dr. Sarah Chen",
      role: "Lead Pharmacist, MediCare Pharmacy",
    },
    {
      quote: "The drug interaction checker has prevented several potential issues. It's an essential safety tool.",
      author: "Raj Patel",
      role: "Pharmacy Manager, HealthPlus",
    },
    {
      quote: "Barcode scanning and automated alerts mean we never run out of critical medications anymore.",
      author: "Emily Rodriguez",
      role: "Operations Director, CityPharm",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Fixed Header */}
      <header className="sticky top-0 w-full border-b border-[#0F172A] bg-white z-50">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#16a34a] to-[#15803d] border border-[#0F172A]" />
            <span 
              className="text-[#0F172A] text-[20px] font-black uppercase tracking-tight"
              style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.5px' }}
            >
              PHARMAAI
            </span>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 text-[13px] font-bold text-[#0F172A] hover:bg-[#F8FAFC] transition-all border border-[#0F172A]"
              style={{ borderRadius: '999px' }}
            >
              LOG IN
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-6 py-2.5 text-[13px] font-black text-white bg-[#16a34a] hover:bg-[#15803d] transition-all border border-[#0F172A]"
              style={{ borderRadius: '999px' }}
            >
              SIGN UP
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-8 py-24 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-[#F8FAFC]" />
        
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-16">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#0F172A] mb-8"
              style={{ borderRadius: '999px' }}
            >
              <div className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-[#16a34a]">
                AI-Powered Pharmacy Management
              </span>
            </div>

            {/* Main Heading */}
            <h1 
              className="text-[72px] font-black uppercase text-[#0F172A] tracking-tight mb-6 leading-none"
              style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, letterSpacing: '-0.03em' }}
            >
              INVENTORY THAT
              <br />
              <span className="text-[#16a34a]">THINKS AHEAD</span>
            </h1>

            {/* Subheading */}
            <p className="text-[20px] text-[#64748B] font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
              From scanning a barcode to catching a drug interaction — PharmaAI handles the complexity so you can focus on care.
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center justify-center gap-4 mb-20">
              <button
                onClick={() => navigate('/signup')}
                className="group px-10 py-5 text-[15px] font-black text-white bg-[#16a34a] hover:bg-[#15803d] transition-all border border-[#0F172A] flex items-center gap-2"
                style={{ borderRadius: '999px' }}
              >
                GET STARTED FREE
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-10 py-5 text-[15px] font-black text-[#0F172A] bg-white hover:bg-[#F8FAFC] transition-all border border-[#0F172A]"
                style={{ borderRadius: '999px' }}
              >
                SIGN IN
              </button>
            </div>
          </div>

          {/* Hero Image Placeholder */}
          <div className="relative rounded-3xl overflow-hidden border border-[#0F172A]">
            <div className="aspect-video bg-white flex items-center justify-center border-b border-[#0F172A]">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#16a34a] border border-[#0F172A] flex items-center justify-center">
                  <Package className="w-12 h-12 text-white" strokeWidth={2} />
                </div>
                <p className="text-[#64748B] text-sm font-bold uppercase tracking-wide">Dashboard Preview</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-8 py-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[48px] font-black uppercase text-[#0F172A] mb-4 tracking-tight">
              EVERYTHING YOU NEED
            </h2>
            <p className="text-[18px] text-[#64748B] max-w-2xl mx-auto">
              Powerful features designed specifically for modern pharmacy operations
            </p>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group bg-white border border-[#0F172A] rounded-3xl p-8 text-left hover:bg-[#F0FDF4] transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-[#16a34a] border border-[#0F172A] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-[16px] font-black uppercase text-[#0F172A] mb-3 tracking-wide">
                  {feature.title}
                </h3>
                <p className="text-[14px] text-[#64748B] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-8 py-24 bg-[#16a34a] border-y border-[#0F172A]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[48px] font-black uppercase mb-4 tracking-tight text-white">
              PROVEN RESULTS
            </h2>
            <p className="text-[18px] text-white/80 max-w-2xl mx-auto">
              Join hundreds of pharmacies already using PharmaAI
            </p>
          </div>

          <div className="grid grid-cols-3 gap-12">
            {benefits.map((benefit) => (
              <div key={benefit.label} className="text-center bg-white border border-[#0F172A] rounded-3xl p-8">
                <div className="text-[64px] font-black text-[#0F172A] mb-2 leading-none">
                  {benefit.stat}
                </div>
                <div className="text-[20px] font-bold mb-3 text-[#0F172A]">
                  {benefit.label}
                </div>
                <p className="text-[14px] text-[#64748B] leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-8 py-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[48px] font-black uppercase text-[#0F172A] mb-4 tracking-tight">
              HOW IT WORKS
            </h2>
            <p className="text-[18px] text-[#64748B] max-w-2xl mx-auto">
              Get started in minutes, not hours
            </p>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Sign Up',
                description: 'Create your account in under 60 seconds. No credit card required.',
              },
              {
                step: '02',
                title: 'Import Inventory',
                description: 'Scan barcodes or upload your existing inventory via CSV.',
              },
              {
                step: '03',
                title: 'Start Managing',
                description: 'Let AI handle alerts, interactions, and analytics automatically.',
              },
            ].map((item) => (
              <div key={item.step} className="relative bg-white border border-[#0F172A] rounded-3xl p-8">
                <div className="text-[72px] font-black text-[#16a34a]/20 leading-none mb-4">
                  {item.step}
                </div>
                <h3 className="text-[20px] font-black uppercase text-[#0F172A] mb-3">
                  {item.title}
                </h3>
                <p className="text-[14px] text-[#64748B] leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="px-8 py-24 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[48px] font-black uppercase text-[#0F172A] mb-4 tracking-tight">
              TRUSTED BY PHARMACISTS
            </h2>
            <p className="text-[18px] text-[#64748B] max-w-2xl mx-auto">
              See what pharmacy professionals are saying
            </p>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#0F172A] rounded-3xl p-8 hover:bg-[#F0FDF4] transition-all"
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-5 h-5 rounded-full bg-[#16a34a]" />
                  ))}
                </div>
                <p className="text-[15px] text-[#0F172A] leading-relaxed mb-6 font-medium">
                  "{testimonial.quote}"
                </p>
                <div className="border-t border-[#0F172A] pt-4">
                  <p className="text-[14px] font-black text-[#0F172A]">
                    {testimonial.author}
                  </p>
                  <p className="text-[12px] text-[#64748B] mt-1">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-8 py-24 bg-gradient-to-br from-[#16a34a] to-[#15803d] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[56px] font-black uppercase mb-6 tracking-tight leading-none">
            READY TO TRANSFORM
            <br />
            YOUR PHARMACY?
          </h2>
          <p className="text-[20px] text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join the future of pharmacy management. Start your free trial today.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate('/signup')}
              className="group px-12 py-5 text-[15px] font-black text-[#16a34a] bg-white hover:bg-gray-50 transition-all shadow-2xl flex items-center gap-2"
              style={{ borderRadius: '999px' }}
            >
              START FREE TRIAL
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
            </button>
          </div>
          <p className="text-[13px] text-white/70 mt-6">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-[#E2E8F0] bg-white py-12">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#16a34a] to-[#15803d] border border-[#0F172A] shadow-lg" />
                <span className="text-[#0F172A] text-[18px] font-black uppercase tracking-tight">
                  PHARMAAI
                </span>
              </div>
              <p className="text-[13px] text-[#64748B] leading-relaxed">
                AI-powered pharmacy management for the modern era.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-[12px] font-black uppercase text-[#0F172A] mb-4 tracking-wider">
                PRODUCT
              </h4>
              <ul className="space-y-2">
                {['Features', 'Pricing', 'Security', 'Roadmap'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-[13px] text-[#64748B] hover:text-[#0F172A] transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-[12px] font-black uppercase text-[#0F172A] mb-4 tracking-wider">
                COMPANY
              </h4>
              <ul className="space-y-2">
                {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-[13px] text-[#64748B] hover:text-[#0F172A] transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-[12px] font-black uppercase text-[#0F172A] mb-4 tracking-wider">
                LEGAL
              </h4>
              <ul className="space-y-2">
                {['Privacy', 'Terms', 'Compliance', 'Licenses'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-[13px] text-[#64748B] hover:text-[#0F172A] transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-[#E2E8F0] pt-8 flex items-center justify-between">
            <p className="text-[12px] text-[#94A3B8] font-medium">
              © 2026 PharmaAI. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-[#64748B] hover:text-[#0F172A] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
              </a>
              <a href="#" className="text-[#64748B] hover:text-[#0F172A] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" /></svg>
              </a>
              <a href="#" className="text-[#64748B] hover:text-[#0F172A] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
