import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { APP_NAME, API_BASE_URL } from '../constants';
import { useAuth, useSettings } from '../context/AppContext';
import CustomSelect from '../components/CustomSelect';


interface ContactFormData {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
}

const ContactUs: React.FC = () => {
    const { isAuthenticated, setLoginModalOpen } = useAuth();
    const { companyPhone, companyEmail } = useSettings();
    const [formData, setFormData] = useState<ContactFormData>({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('dashboard-theme');
        return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    React.useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            document.body.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.body.classList.remove('dark');
        }
        localStorage.setItem('dashboard-theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    React.useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            if (!localStorage.getItem('dashboard-theme')) {
                setIsDark(e.matches);
            }
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    React.useEffect(() => {
        return () => {
            document.documentElement.classList.remove('dark');
            document.body.classList.remove('dark');
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            await axios.post(`${API_BASE_URL}/contact`, formData);
            setIsSuccess(true);
            setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
        } catch (err: any) {
            const errorData = err.response?.data;
            const msg = errorData?.error || 'Something went wrong. Please try again.';
            const details = errorData?.details ? ` (Reason: ${errorData.details})` : '';
            setError(`${msg}${details}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const shell = isDark
        ? 'bg-[#151619] text-white'
        : 'bg-[#f5f7fb] text-[#111827]';

    const panel = isDark
        ? 'bg-[#222327] border-[#22242a]'
        : 'bg-white border-[#dfe5ee]';

    const accentBlue = '#246BFF';
    const accentBorder = '#D7E3FF';
    const muted = isDark ? 'text-[#a9adb8]' : 'text-[#667085]';
    const label = isDark ? 'text-[#d9dde7]' : 'text-[#334155]';

    return (
        <div className={`min-h-screen font-sans transition-colors duration-300 ${shell}`}>
            <header className={`h-[76px] border-b px-3 transition-colors duration-300 sm:px-8 ${isDark ? 'border-[#202125] bg-[#101112]' : 'border-[#e4e8f0] bg-white'}`}>
                <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 sm:gap-5">
                        <img src="/logo.png" alt={`${APP_NAME} Logo`} className="h-8 w-auto object-contain opacity-75" />
                        <span className={`text-[20px] sm:text-[30px] font-black uppercase leading-none tracking-[-0.02em] ${isDark ? 'text-white' : 'text-[#111827]'}`}>
                            {APP_NAME}
                        </span>
                    </Link>

                    <div className="flex items-center gap-3 sm:gap-4">
                        <button
                            type="button"
                            onClick={() => setIsDark(prev => !prev)}
                            className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition ${isDark ? 'border-[#24262b] bg-[#1e2025] text-[#f8fafc] hover:bg-[#252830]' : 'border-[#d8deea] bg-[#eef3fb] text-[#126bff] hover:bg-[#e2eaf7]'}`}
                            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'} text-xs sm:text-base`}></i>
                        </button>
                        <div className={`flex items-center gap-1.5 p-1 sm:p-0 rounded-full border border-solid transition-colors duration-300 sm:border-none sm:bg-transparent sm:gap-4 ${isDark ? 'border-[#24262b] bg-[#101112]' : 'border-[#d8deea] bg-[#f0f4fc]'}`}>
                            <Link
                                to="/"
                                className={`flex h-10 w-10 sm:w-auto items-center justify-center sm:gap-2 rounded-full text-sm font-extrabold transition ${isDark ? 'text-[#126bff] hover:bg-[#202226] sm:border sm:border-[#24262b] sm:bg-[#18191b]' : 'text-[#126bff] hover:bg-[#e2eaf7] sm:border sm:border-[#D7E3FF] sm:bg-white sm:hover:border-[#C7D8FF] sm:hover:bg-[#EEF4FF]'}`}
                                style={!isDark ? { color: accentBlue } : undefined}
                            >
                                <i className="fa-solid fa-house text-base sm:text-sm"></i>
                                <span className="hidden sm:inline">Home</span>
                            </Link>
                            {isAuthenticated ? (
                                <Link
                                    to="/dashboard"
                                    className={`flex h-10 w-10 sm:w-auto items-center justify-center sm:gap-2 rounded-full text-sm font-extrabold transition ${isDark ? 'text-[#126bff] hover:bg-[#202226] sm:border sm:border-[#24262b] sm:bg-[#18191b]' : 'text-[#126bff] hover:bg-[#e2eaf7] sm:border sm:border-[#D7E3FF] sm:bg-white sm:hover:border-[#C7D8FF] sm:hover:bg-[#EEF4FF]'}`}
                                    style={!isDark ? { color: accentBlue } : undefined}
                                >
                                    <i className="fa-solid fa-square-poll-horizontal text-base sm:text-sm"></i>
                                    <span className="hidden sm:inline">Dashboard</span>
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setLoginModalOpen(true)}
                                    className={`flex h-10 w-10 sm:w-auto items-center justify-center sm:gap-2 rounded-full text-sm font-extrabold transition ${isDark ? 'text-[#126bff] hover:bg-[#202226] sm:border sm:border-[#24262b] sm:bg-[#18191b]' : 'text-[#126bff] hover:bg-[#e2eaf7] sm:border sm:border-[#D7E3FF] sm:bg-white sm:hover:border-[#C7D8FF] sm:hover:bg-[#EEF4FF]'}`}
                                    style={!isDark ? { color: accentBlue } : undefined}
                                >
                                    <i className="fa-solid fa-right-to-bracket text-base sm:text-sm"></i>
                                    <span className="hidden sm:inline">Login</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-12 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className={`mb-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl ${isDark ? 'text-white' : 'text-[#111827]'}`}>
                        Contact Us
                    </h1>
                    <p className={`mx-auto max-w-2xl text-lg leading-8 ${muted}`}>
                        Have a question about our air conditioning products or services? We&apos;re here to help. Reach out to our team of experts.
                    </p>
                </div>

                <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 lg:flex-row">
                    <div className="flex shrink-0 flex-col gap-6 lg:w-1/3">
                        <div className={`group flex items-start gap-4 rounded-2xl border p-8 shadow-[0_24px_32px_rgba(0,0,0,0.16)] transition ${panel}`}>
                            <div
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#D7E3FF] bg-white text-[#246BFF] transition group-hover:bg-[#246BFF] group-hover:text-[#E5E7EB] dark:border-[#1f2638] dark:bg-[#1f2638]"
                            >
                                <i className="fa-solid fa-phone text-xl"></i>
                            </div>
                            <div>
                                <h3 className={`mb-1 text-lg font-bold ${isDark ? 'text-white' : 'text-[#111827]'}`}>Call Us</h3>
                                <p className={`mb-3 text-sm ${muted}`}>Mon-Fri from 9am to 6pm</p>
                                <a href={`tel:${companyPhone.replace(/\D/g, '')}`} className="text-lg font-semibold transition hover:opacity-80" style={{ color: accentBlue }}>
                                    {companyPhone}
                                </a>
                            </div>
                        </div>

                        <div className={`group flex items-start gap-4 rounded-2xl border p-8 shadow-[0_24px_32px_rgba(0,0,0,0.16)] transition ${panel}`}>
                            <div
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#D7E3FF] bg-white text-[#246BFF] transition group-hover:bg-[#246BFF] group-hover:text-[#E5E7EB] dark:border-[#1f2638] dark:bg-[#1f2638]"
                            >
                                <i className="fa-solid fa-location-dot text-xl"></i>
                            </div>
                            <div>
                                <h3 className={`mb-1 text-lg font-bold ${isDark ? 'text-white' : 'text-[#111827]'}`}>Visit Us</h3>
                                <p className={`text-sm leading-relaxed ${muted}`}>
                                    Mitsubishi Electric - Satguru Engineers<br />
                                    SCF-29 PH-2<br />
                                    Sahibzada Ajit Singh Nagar, Punjab 160055
                                </p>
                                <a
                                    href="https://maps.google.com/?q=Mitsubishi+Electric+-+Satguru+Engineers,+SCF-29+PH-2,+Sahibzada+Ajit+Singh+Nagar,+Punjab+160055"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold transition hover:opacity-80"
                                    style={{ color: accentBlue }}
                                >
                                    Get Directions <i className="fa-solid fa-arrow-right text-xs"></i>
                                </a>
                            </div>
                        </div>

                        <div className={`group flex items-start gap-4 rounded-2xl border p-8 shadow-[0_24px_32px_rgba(0,0,0,0.16)] transition ${panel}`}>
                            <div
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#D7E3FF] bg-white text-[#246BFF] transition group-hover:bg-[#246BFF] group-hover:text-[#E5E7EB] dark:border-[#1f2638] dark:bg-[#1f2638]"
                            >
                                <i className="fa-solid fa-envelope text-xl"></i>
                            </div>
                            <div>
                                <h3 className={`mb-1 text-lg font-bold ${isDark ? 'text-white' : 'text-[#111827]'}`}>Email Us</h3>
                                <p className={`mb-3 text-sm ${muted}`}>Drop us a line anytime</p>
                                <a href={`mailto:${companyEmail}`} className="break-all text-sm font-semibold transition hover:opacity-80" style={{ color: accentBlue }}>
                                    {companyEmail}
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className={`lg:w-2/3 rounded-2xl border p-8 shadow-[0_24px_32px_rgba(0,0,0,0.16)] ${panel}`}>
                        <h2 className={`mb-6 flex items-center gap-2 text-2xl font-black ${isDark ? 'text-white' : 'text-[#111827]'}`}>
                            <i className="fa-solid fa-paper-plane" style={{ color: accentBlue }}></i> Send us a Message
                        </h2>

                        {isSuccess ? (
                            <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center text-emerald-200">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                                    <i className="fa-solid fa-check text-2xl"></i>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Message Sent Successfully!</h3>
                                    <p className="mt-1 text-sm text-emerald-200/80">Thank you for reaching out. We will get back to you shortly.</p>
                                </div>
                                <button
                                    onClick={() => setIsSuccess(false)}
                                    className="mt-2 rounded-xl px-6 py-2 text-sm font-bold text-white transition hover:opacity-90"
                                    style={{ backgroundColor: accentBlue }}
                                >
                                    Send Another Message
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
                                        <i className="fa-solid fa-circle-exclamation mt-1 text-red-300"></i>
                                        <div className="flex-1 space-y-1">
                                            <p className="font-bold">Message could not be sent</p>
                                            <p className="text-red-100/80">{error}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label htmlFor="name" className={`block text-sm font-medium ${label}`}>Full Name <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className={`w-full rounded-xl border px-4 py-3 outline-none transition focus:ring-2 ${isDark ? 'border-[#2a2e36] bg-[#191b1f] text-white placeholder:text-[#6b7280] focus:border-[#126bff] focus:ring-[#126bff]/20' : 'border-[#d7deea] bg-white text-[#111827] placeholder:text-[#94a3b8] focus:border-[#126bff] focus:ring-[#126bff]/20'}`}
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="email" className={`block text-sm font-medium ${label}`}>Email Address <span className="text-red-500">*</span></label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            className={`w-full rounded-xl border px-4 py-3 outline-none transition focus:ring-2 ${isDark ? 'border-[#2a2e36] bg-[#191b1f] text-white placeholder:text-[#6b7280] focus:border-[#126bff] focus:ring-[#126bff]/20' : 'border-[#d7deea] bg-white text-[#111827] placeholder:text-[#94a3b8] focus:border-[#126bff] focus:ring-[#126bff]/20'}`}
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label htmlFor="phone" className={`block text-sm font-medium ${label}`}>Phone Number</label>
                                        <input
                                            type="tel"
                                            id="phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className={`w-full rounded-xl border px-4 py-3 outline-none transition focus:ring-2 ${isDark ? 'border-[#2a2e36] bg-[#191b1f] text-white placeholder:text-[#6b7280] focus:border-[#126bff] focus:ring-[#126bff]/20' : 'border-[#d7deea] bg-white text-[#111827] placeholder:text-[#94a3b8] focus:border-[#126bff] focus:ring-[#126bff]/20'}`}
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="subject" className={`block text-sm font-medium ${label}`}>Subject</label>
                                        <CustomSelect
                                            value={formData.subject}
                                            onChange={val => setFormData(prev => ({ ...prev, subject: val }))}
                                            options={[
                                                { value: "Sales Inquiry", label: "Sales Inquiry" },
                                                { value: "Technical Support", label: "Technical Support" },
                                                { value: "Request a Quote", label: "Request a Quote" },
                                                { value: "Other", label: "Other" }
                                            ]}
                                            isDark={isDark}
                                            placeholder="Select a subject..."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="message" className={`block text-sm font-medium ${label}`}>Message <span className="text-red-500">*</span></label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        required
                                        rows={5}
                                        value={formData.message}
                                        onChange={handleChange}
                                        className={`w-full resize-none rounded-xl border px-4 py-3 outline-none transition focus:ring-2 ${isDark ? 'border-[#2a2e36] bg-[#191b1f] text-white placeholder:text-[#6b7280] focus:border-[#126bff] focus:ring-[#126bff]/20' : 'border-[#d7deea] bg-white text-[#111827] placeholder:text-[#94a3b8] focus:border-[#126bff] focus:ring-[#126bff]/20'}`}
                                        placeholder="How can we help you?"
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl px-8 text-sm font-black text-white shadow-[0_12px_26px_rgba(36,107,255,0.28)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                                    style={{ backgroundColor: accentBlue }}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <i className="fa-solid fa-circle-notch fa-spin"></i>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            Send Message
                                            <i className="fa-solid fa-paper-plane"></i>
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </main>

            <footer className={`mt-auto border-t py-8 text-center text-sm ${isDark ? 'border-[#242529] bg-[#101112] text-[#6e737e]' : 'border-[#e2e8f0] bg-white text-[#667085]'}`}>
                &copy; {new Date().getFullYear()} Satguru Engineers. All rights reserved.
            </footer>
        </div>
    );
};

export default ContactUs;
