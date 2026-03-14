import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { APP_NAME, API_BASE_URL } from '../constants';
import { useAuth } from '../App';

const ContactUs: React.FC = () => {
    const { isAuthenticated } = useAuth();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

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
            const msg = err.response?.data?.error || 'Something went wrong. Please try again.';
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
            {/* Header */}
            <header className="border-b border-slate-200 py-3 px-4 sm:py-4 sm:px-6 flex justify-between items-center bg-white sticky top-0 z-50 shadow-sm">
                <Link to="/" className="flex flex-col sm:flex-row items-center sm:gap-3 gap-1 hover:opacity-90 transition-opacity">
                    <img src="/logo.png" alt={`${APP_NAME} Logo`} className="h-10 sm:h-12 w-auto object-contain drop-shadow-sm" />
                    <span className="font-normal text-xs sm:text-2xl lg:text-3xl tracking-tight text-slate-900 uppercase text-center sm:text-left leading-tight" style={{ fontFamily: "'Open Sans', sans-serif" }}>{APP_NAME}</span>
                </Link>
                <div className="flex items-center gap-3 sm:gap-4">
                    <Link to="/" className="text-xs sm:text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
                        Home
                    </Link>
                    {isAuthenticated ? (
                        <Link to="/dashboard" className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all" title="Dashboard">
                            <i className="fa-solid fa-gauge text-base sm:text-lg"></i>
                        </Link>
                    ) : (
                        <Link to="/login" className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-50 text-slate-500 hover:bg-blue-600 hover:text-white rounded-lg transition-all" title="Staff Login">
                            <i className="fa-solid fa-user-lock text-base sm:text-lg"></i>
                        </Link>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl mx-auto w-full py-12 px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12 animate-in slide-in-from-bottom-4 duration-500 fade-in">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900">Contact Us</h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Have a question about our air conditioning products or services? We're here to help. Reach out to our team of experts.
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-12 max-w-6xl mx-auto">
                    {/* Contact Information Cards */}
                    <div className="lg:w-1/3 flex flex-col gap-6 animate-in slide-in-from-left-8 duration-700 fade-in flex-shrink-0">
                        <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow group flex items-start gap-4">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                                <i className="fa-solid fa-phone text-xl"></i>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-1">Call Us</h3>
                                <p className="text-slate-500 mb-3 text-sm">Mon-Fri from 9am to 6pm</p>
                                <a href="tel:09592292292" className="text-lg font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                                    +91 95922 92292
                                </a>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow group flex items-start gap-4">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                                <i className="fa-solid fa-location-dot text-xl text-center"></i>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-1">Visit Us</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    Mitsubishi Electric - Satguru Engineers<br />
                                    SCF-29 PH-2<br />
                                    Sahibzada Ajit Singh Nagar, Punjab 160055
                                </p>
                                <a
                                    href="https://maps.google.com/?q=Mitsubishi+Electric+-+Satguru+Engineers,+SCF-29+PH-2,+Sahibzada+Ajit+Singh+Nagar,+Punjab+160055"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    Get Directions <i className="fa-solid fa-arrow-right text-xs"></i>
                                </a>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow group flex items-start gap-4">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                                <i className="fa-solid fa-envelope text-xl"></i>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-1">Email Us</h3>
                                <p className="text-slate-500 mb-3 text-sm">Drop us a line anytime</p>
                                <a href="mailto:contactsatguruengineer@gmail.com" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors break-all">
                                    contactsatguruengineer@gmail.com
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:w-2/3 bg-white rounded-2xl p-8 shadow-xl border border-slate-100 animate-in slide-in-from-right-8 duration-700 fade-in">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <i className="fa-solid fa-paper-plane text-blue-600"></i> Send us a Message
                        </h2>

                        {isSuccess ? (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-6 rounded-xl flex flex-col items-center justify-center text-center gap-4 h-64 animate-in zoom-in-95 duration-300">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                    <i className="fa-solid fa-check text-2xl"></i>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Message Sent Successfully!</h3>
                                    <p className="text-sm mt-1 opacity-90">Thank you for reaching out. We will get back to you shortly.</p>
                                </div>
                                <button
                                    onClick={() => setIsSuccess(false)}
                                    className="mt-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors"
                                >
                                    Send Another Message
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-center gap-2">
                                        <i className="fa-solid fa-circle-exclamation"></i>
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="name" className="block text-sm font-medium text-slate-700">Full Name <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email Address <span className="text-red-500">*</span></label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="phone" className="block text-sm font-medium text-slate-700">Phone Number</label>
                                        <input
                                            type="tel"
                                            id="phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="subject" className="block text-sm font-medium text-slate-700">Subject</label>
                                        <select
                                            id="subject"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                                        >
                                            <option value="">Select a subject...</option>
                                            <option value="Sales Inquiry">Sales Inquiry</option>
                                            <option value="Technical Support">Technical Support</option>
                                            <option value="Request a Quote">Request a Quote</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="message" className="block text-sm font-medium text-slate-700">Message <span className="text-red-500">*</span></label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        required
                                        rows={5}
                                        value={formData.message}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
                                        placeholder="How can we help you?"
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full md:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm md:text-base rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
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

            {/* Footer */}
            <footer className="text-center py-8 text-slate-500 text-sm border-t border-slate-200 mt-auto bg-white">
                &copy; {new Date().getFullYear()} Satguru Engineers. All rights reserved.
            </footer>
        </div>
    );
};

export default ContactUs;
