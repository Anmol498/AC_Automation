import React from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME } from '../constants';
import { useAuth, useSettings } from '../context/AppContext';

type Product = {
    id: string;
    name: string;
    category: 'split' | 'pac';
    series: 'inverter' | 'non-inverter' | 'winter-summer';
    description: string;
    imageUrl: string;
};

const products: Product[] = [
    {
        id: 'msz-hp',
        name: 'MSZ-HP',
        category: 'split',
        series: 'winter-summer',
        description: 'Compact, high performance indoor and outdoor units and advanced inverter technologies provide superior energy savings and comfort in all rooms.',
        imageUrl: '/msz-hp.jpg'
    },
    {
        id: 'msy-grt',
        name: 'MSY-GRT',
        category: 'split',
        series: 'inverter',
        description: 'GR-T Series are empowered with Tropical Inverter Technology to bring optimal comfort. The New Luxurious and Stylish Designs are developed to suit the air conditioning needs of tropical regions. The operational range of MSY GR(T) Series is up to 52 degree Celsius (Outdoor Temperature) with an optimized heat exchanger and the PCBs for improved cooling performance.',
        imageUrl: '/msy-grt.jpg'
    },
    {
        id: 'msy-gr',
        name: 'MSY-GR',
        category: 'split',
        series: 'inverter',
        description: "GR Series features advanced Inverter Technology that utilize MITSUBISHI ELECTRIC's cutting edge technology which ensures faster cooling with high energy efficiency catering to the needs of Indian climatic conditions.",
        imageUrl: '/msy-gr.jpg'
    },
    {
        id: 'msy-rjs',
        name: 'Kirigamine (MSY-RJS)',
        category: 'split',
        series: 'inverter',
        description: 'Kirigamine Highlands is an eminent scenic spot with a splendid view of Suwa City in Nagano, Mt. Fuji, the Yatsugatake mountain range and alpine flora of each season. With a strong updraft around it, the upland is also known as the birthplace of gliding in Japan. In spring 2017, "Kirigamine," in honor of the brand\'s 50th anniversary, was awarded a letter of gratitude from Suwa City for its contribution towards enhancing tourism & making Suwa City a popular tourist destination in Japan.',
        imageUrl: '/msy-rjs.png'
    },
    {
        id: 'ms-agz',
        name: 'MS-AGZ',
        category: 'split',
        series: 'non-inverter',
        description: "Bring refreshing comfort to your home with Mitsubishi Electric's fixed-speed AC, designed for optimal cooling and quiet performance.",
        imageUrl: '/MS-AGZ.png'
    },
    {
        id: 'ms-gk',
        name: 'MS-GK',
        category: 'split',
        series: 'non-inverter',
        description: "Mitsubishi Electric's unwavering commitment to research and development is helping us create the next generation of groundbreaking technologies.",
        imageUrl: '/MS-GK.png'
    },
    {
        id: 'pey-series',
        name: 'PEY Series',
        category: 'pac',
        series: 'inverter',
        description: 'New Inverter Technology has made it possible for units to operate at outdoor-air temperatures as high as 52 C. Tropical Specification series units are perfect for cooling homes and offices in tropical regions.',
        imageUrl: '/pey.jpg'
    },
    {
        id: 'pe-m-series',
        name: 'PE-M Series',
        category: 'pac',
        series: 'non-inverter',
        description: 'The thin, ceiling-concealed indoor units are perfect answer for the air-conditioning requirements of buildings with minimum ceiling installation space and wide-ranging external static pressure.',
        imageUrl: '/pe-m.jpg'
    },
    {
        id: 'sez-pead-series',
        name: 'SEZ/PEAD Series',
        category: 'pac',
        series: 'winter-summer',
        description: 'Ultra thin Ceiling Concealed indoor units of this series are the perfect answer for the air conditioning needs of modern buildings with minimum ceiling installation space requirements.',
        imageUrl: '/sez.jpeg'
    },
    {
        id: 'pla-rp-series',
        name: 'PLA-RP Series',
        category: 'pac',
        series: 'winter-summer',
        description: 'A complete line-up including deluxe units that offer added energy savings. Wide air-outlet and 3D i-see Sensor enhance airflow distribution control.',
        imageUrl: '/pla-rp.jpg'
    },
    {
        id: 'ply-sp-ea',
        name: 'PLY-SP EA',
        category: 'pac',
        series: 'inverter',
        description: "Mitsubishi Electric Inverter series are the perfect answer to today's cooling needs. Wide-angle outlets distribute air flow to all corners of the room.",
        imageUrl: '/ply-sp.jpg'
    },
    {
        id: 'pl-m-series',
        name: 'PL-M Series',
        category: 'pac',
        series: 'non-inverter',
        description: 'Advanced Non Inverter Ceiling Cassette matching the needs of modern commercial and residential applications.',
        imageUrl: '/pl-m.jpg'
    }
];

const getSeriesLabel = (product: Product) => {
    const id = product.id.toLowerCase();
    if (id.includes('grt')) return 'GRT SERIES';
    if (id.includes('gr')) return 'GR SERIES';
    if (id.includes('rjs')) return 'KIRIGAMINE';
    if (id.includes('hp')) return 'HP SERIES';
    if (id.includes('agz')) return 'AGZ SERIES';
    if (id.includes('gk')) return 'GK SERIES';
    if (id.includes('pey')) return 'PEY SERIES';
    if (id.includes('pe-m')) return 'PE-M SERIES';
    if (id.includes('sez') || id.includes('pead')) return 'SEZ/PEAD SERIES';
    if (id.includes('pla-rp')) return 'PLA-RP SERIES';
    if (id.includes('ply-sp')) return 'PLY-SP SERIES';
    if (id.includes('pl-m')) return 'PL-M SERIES';
    return 'MITSUBISHI ELECTRIC';
};

const mainTabs = [
    { id: 'split', label: 'Split AC' },
    { id: 'pac', label: 'PAC' },
    { id: 'vrf', label: 'VRF Systems' }
] as const;

const seriesTabs = [
    { id: 'inverter', label: 'Inverter' },
    { id: 'non-inverter', label: 'Non Inverter' },
    { id: 'winter-summer', label: 'Hot & Cold' }
] as const;

const segmentedButtonClass = (active: boolean, isDark: boolean) =>
    [
        'min-w-[108px] rounded-[12px] px-6 py-3 text-center text-sm font-extrabold transition-all duration-200',
        active
            ? isDark
                ? 'bg-[#292a2e] text-white shadow-[0_1px_0_rgba(255,255,255,0.05)]'
                : 'bg-white text-[#151619] shadow-[0_2px_12px_rgba(15,23,42,0.08)]'
            : isDark
                ? 'text-[#a8acb8] hover:text-white'
                : 'text-[#6d7484] hover:text-[#151619]'
    ].join(' ');

const Home: React.FC = () => {
    const { isAuthenticated, setLoginModalOpen } = useAuth();
    const { companyPhone } = useSettings();
    const topbarBlue = '#246BFF';
    const [mainTab, setMainTab] = React.useState<'split' | 'pac' | 'vrf'>('split');
    const [activeSplitSeries, setActiveSplitSeries] = React.useState<Product['series']>('inverter');
    const [activePacSeries, setActivePacSeries] = React.useState<Product['series']>('inverter');
    const [showPhonePopup, setShowPhonePopup] = React.useState(false);
    const [isVideoMuted, setIsVideoMuted] = React.useState(true);
    const [isDark, setIsDark] = React.useState(() => {
        const saved = localStorage.getItem('dashboard-theme');
        return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    const sectionRef = React.useRef<HTMLDivElement>(null);

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

    const activeSeries = mainTab === 'pac' ? activePacSeries : activeSplitSeries;
    const visibleProducts = products.filter(product => product.category === mainTab && product.series === activeSeries);

    const scrollToCatalog = () => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const updateSeries = (series: Product['series']) => {
        if (mainTab === 'pac') {
            setActivePacSeries(series);
        } else {
            setActiveSplitSeries(series);
        }
    };

    return (
        <div className={`min-h-screen font-sans transition-colors duration-300 ${isDark ? 'bg-[#151619] text-white' : 'bg-[#f5f7fb] text-[#111827]'}`}>
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
                        <div className={`flex items-center gap-1.5 p-1 rounded-full border transition-colors duration-300 sm:border-0 sm:bg-transparent sm:p-0 sm:gap-4 ${isDark ? 'border-[#24262b] bg-[#101112] sm:bg-transparent' : 'border-[#d8deea] bg-[#f0f4fc] sm:bg-transparent'}`}>
                            <Link
                                to="/contact"
                                className={`flex h-10 w-10 sm:h-10 sm:w-auto items-center justify-center sm:gap-2 rounded-full p-0 sm:px-5 text-sm font-extrabold transition ${isDark ? 'text-[#126bff] hover:bg-[#202226] sm:border sm:border-[#24262b] sm:bg-[#18191b]' : 'text-[#126bff] hover:bg-[#e2eaf7] sm:border sm:border-[#D7E3FF] sm:bg-white sm:hover:border-[#C7D8FF] sm:hover:bg-[#EEF4FF]'}`}
                                style={!isDark ? { color: topbarBlue } : undefined}
                            >
                                <i className="fa-solid fa-envelope text-base sm:text-sm"></i>
                                <span className="hidden sm:inline">Contact Us</span>
                            </Link>
                            {isAuthenticated ? (
                                <Link
                                    to="/dashboard"
                                    className={`flex h-10 w-10 sm:h-10 sm:w-auto items-center justify-center sm:gap-2 rounded-full p-0 sm:px-5 text-sm font-extrabold transition ${isDark ? 'text-[#126bff] hover:bg-[#202226] sm:border sm:border-[#24262b] sm:bg-[#18191b]' : 'text-[#126bff] hover:bg-[#e2eaf7] sm:border sm:border-[#D7E3FF] sm:bg-white sm:hover:border-[#C7D8FF] sm:hover:bg-[#EEF4FF]'}`}
                                    style={!isDark ? { color: topbarBlue } : undefined}
                                >
                                    <i className="fa-solid fa-square-poll-horizontal text-base sm:text-sm"></i>
                                    <span className="hidden sm:inline">Dashboard</span>
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setLoginModalOpen(true)}
                                    className={`flex h-10 w-10 sm:h-10 sm:w-auto items-center justify-center sm:gap-2 rounded-full p-0 sm:px-5 text-sm font-extrabold transition ${isDark ? 'text-[#126bff] hover:bg-[#202226] sm:border sm:border-[#24262b] sm:bg-[#18191b]' : 'text-[#126bff] hover:bg-[#e2eaf7] sm:border sm:border-[#D7E3FF] sm:bg-white sm:hover:border-[#C7D8FF] sm:hover:bg-[#EEF4FF]'}`}
                                    style={!isDark ? { color: topbarBlue } : undefined}
                                >
                                    <i className="fa-solid fa-right-to-bracket text-base sm:text-sm"></i>
                                    <span className="hidden sm:inline">Login</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <section className={`border-b px-6 py-[94px] transition-colors duration-300 sm:px-8 ${isDark ? 'border-[#20232a]' : 'border-[#20232a]'} bg-[linear-gradient(180deg,#091328_0%,#11162c_100%)]`}>
                <div className="mx-auto grid max-w-[1250px] items-center gap-14 lg:grid-cols-[1fr_580px]">
                    <div className="max-w-[610px]">
                        <div className={`mb-9 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold ${isDark ? 'border-[#11427d] bg-[#0a2a55] text-[#4aa0ff]' : 'border-[#9ec7ff] bg-white/10 text-white'}`}>
                            <i className="fa-solid fa-circle-check text-[10px]"></i>
                            Premium AC Solutions & Sales
                        </div>
                        <h1 className={`max-w-[650px] text-[46px] font-black leading-[1.03] tracking-[-0.04em] sm:text-[62px] lg:text-[72px] ${isDark ? 'text-white' : 'text-white'}`}>
                            Engineered for
                            <br />
                            <span className="bg-[linear-gradient(90deg,#58aaff_0%,#0fb7f4_46%,#7772ff_100%)] bg-clip-text text-transparent">
                                Perfect Comfort
                            </span>
                        </h1>
                        <p className={`mt-8 max-w-[580px] text-lg font-semibold leading-8 ${isDark ? 'text-[#c6cfdf]' : 'text-[#dbe9ff]'}`}>
                            Satguru Engineers -- specialists in installation, service, and distribution of state-of-the-art Mitsubishi Electric cooling systems.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-4">
                            <button
                                type="button"
                                onClick={scrollToCatalog}
                                className="h-12 rounded-xl bg-[#126bff] px-8 text-xs font-black uppercase tracking-[0.06em] text-white shadow-[0_12px_26px_rgba(18,107,255,0.28)] transition hover:bg-[#0f5ee5]"
                            >
                                View Product Catalog
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowPhonePopup(true)}
                                className={`h-12 rounded-xl border px-8 text-xs font-black uppercase tracking-[0.06em] transition ${isDark ? 'border-[#3b4356] bg-[#1f2638] text-white hover:border-[#64708b]' : 'border-white/25 bg-white/12 text-white hover:border-white/35 hover:bg-white/16'}`}
                            >
                                Contact Our Experts
                            </button>
                        </div>
                    </div>

                    <div className="group relative overflow-hidden rounded-[18px] bg-[#071526] shadow-[0_30px_60px_rgba(0,0,0,0.25)]">
                        <video
                            src="/intro.mp4"
                            autoPlay
                            loop
                            muted={isVideoMuted}
                            playsInline
                            className="aspect-[16/9] h-full w-full object-cover opacity-90"
                        />
                        <button
                            type="button"
                            onClick={() => setIsVideoMuted(prev => !prev)}
                            className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition hover:bg-black/70 group-hover:opacity-100"
                            title={isVideoMuted ? 'Unmute video' : 'Mute video'}
                        >
                            <i className={`fa-solid ${isVideoMuted ? 'fa-volume-xmark' : 'fa-volume-high'} text-xs`}></i>
                        </button>
                    </div>
                </div>
            </section>

            <main ref={sectionRef} className={`px-6 pb-[108px] pt-[61px] transition-colors duration-300 sm:px-8 ${isDark ? 'bg-[#151619]' : 'bg-[#f5f7fb]'}`}>
                <div className="mx-auto max-w-[1200px]">
                    <div className="mb-10 flex justify-center">
                        <div className={`flex max-w-full items-center gap-2 overflow-x-auto rounded-[16px] border p-1.5 ${isDark ? 'border-[#232429] bg-[#0d0e10] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.45)]' : 'border-[#d9e0ec] bg-[#edf2f8] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]'}`}>
                            {mainTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setMainTab(tab.id)}
                                    className={segmentedButtonClass(mainTab === tab.id, isDark)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-[46px] text-center">
                        <h2 className={`text-[38px] font-black leading-tight tracking-[-0.04em] sm:text-[48px] ${isDark ? 'text-white' : 'text-[#111827]'}`}>
                            {mainTab === 'split' ? 'Split Air Conditioners' : mainTab === 'pac' ? 'PAC Air Conditioners' : 'VRF Systems'}
                        </h2>
                        <p className={`mt-5 text-lg font-semibold ${isDark ? 'text-[#a9adb8]' : 'text-[#667085]'}`}>
                            Range Of Most Powerful Yet Elegant Air Conditioners
                        </p>
                    </div>

                    {mainTab === 'vrf' ? (
                        <div className={`mx-auto max-w-4xl rounded-[8px] border p-8 text-center shadow-[0_34px_50px_rgba(0,0,0,0.12)] ${isDark ? 'border-[#24262b] bg-[#1f2024]' : 'border-[#dfe6f2] bg-white'}`}>
                            <div className="mb-6 flex flex-col justify-center gap-4 sm:flex-row">
                                <a
                                    href="/City-Multi.pdf"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#126bff] px-6 text-sm font-black text-[#126bff] transition hover:bg-[#126bff] hover:text-white"
                                >
                                    <i className="fa-solid fa-file-pdf"></i>
                                    View VRF
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setShowPhonePopup(true)}
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#126bff] px-6 text-sm font-black text-white transition hover:bg-[#0f5ee5]"
                                >
                                    <i className="fa-solid fa-paper-plane"></i>
                                    Get your Quotation
                                </button>
                            </div>
                            <object data="/City-Multi.pdf#view=FitV" type="application/pdf" className={`h-[70vh] w-full rounded border ${isDark ? 'border-[#333640] bg-[#111214]' : 'border-[#d5deec] bg-[#f6f8fb]'}`}>
                                <a href="/City-Multi.pdf" target="_blank" rel="noopener noreferrer" className="text-[#126bff]">
                                    Download / View Native PDF
                                </a>
                            </object>
                        </div>
                    ) : (
                        <>
                            <div className="mb-16 flex justify-center">
                                <div className={`flex max-w-full items-center gap-2 overflow-x-auto rounded-[16px] border p-1.5 ${isDark ? 'border-[#232429] bg-[#0d0e10] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.45)]' : 'border-[#d9e0ec] bg-[#edf2f8] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]'}`}>
                                    {seriesTabs.map(tab => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => updateSeries(tab.id)}
                                            className={segmentedButtonClass(activeSeries === tab.id, isDark)}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="relative">
                                <div className={`absolute inset-x-[-68px] bottom-[-32px] top-[57px] rounded-[18px] ${isDark ? 'bg-[#101113]' : 'bg-[#e9eef7]'}`}></div>
                                <div className="relative z-10 grid gap-6 md:grid-cols-3">
                                    {visibleProducts.map(product => (
                                        <Link
                                            to={`/product/${product.id}`}
                                            key={product.id}
                                            className={`group flex min-h-[584px] flex-col overflow-hidden rounded-[14px] border shadow-[0_24px_32px_rgba(0,0,0,0.16)] transition duration-300 hover:-translate-y-1 ${isDark ? 'border-[#22242a] bg-[#222327] hover:border-[#2f3441]' : 'border-[#dfe5ee] bg-white hover:border-[#b9c6da]'}`}
                                        >
                                            <div className={`flex h-[182px] items-center justify-center px-8 py-8 ${isDark ? 'bg-[#17181b]' : 'bg-[#f8fafc]'}`}>
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="h-[98px] w-full object-contain transition duration-500 group-hover:scale-[1.03]"
                                                />
                                            </div>
                                            <div className="flex flex-1 flex-col px-6 py-7 text-left">
                                                <span className="text-xs font-black uppercase tracking-[0.06em] text-[#1972ff]">
                                                    {getSeriesLabel(product)}
                                                </span>
                                                <h3 className={`mt-2 text-2xl font-black leading-tight tracking-[-0.03em] ${isDark ? 'text-white' : 'text-[#111827]'}`}>
                                                    {product.name}
                                                </h3>
                                                <p className={`mt-4 flex-1 text-[15px] font-semibold leading-6 ${isDark ? 'text-[#a4a7b2]' : 'text-[#667085]'}`}>
                                                    {product.description}
                                                </p>
                                                <span className="mt-8 inline-flex items-center gap-2 text-sm font-black text-[#1972ff]">
                                                    View specs
                                                    <i className="fa-solid fa-arrow-right text-xs transition group-hover:translate-x-1"></i>
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>

            <footer className={`border-t py-8 text-center text-sm font-semibold ${isDark ? 'border-[#242529] bg-[#101112] text-[#6e737e]' : 'border-[#e2e8f0] bg-white text-[#667085]'}`}>
                &copy; {new Date().getFullYear()} Satguru Engineers. All rights reserved.
            </footer>

            {showPhonePopup && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
                    onClick={() => setShowPhonePopup(false)}
                >
                    <div
                        className={`w-full max-w-sm rounded-[18px] border p-7 text-center shadow-2xl ${isDark ? 'border-[#2d3139] bg-[#1d1f24]' : 'border-[#d8e0ec] bg-white'}`}
                        onClick={event => event.stopPropagation()}
                    >
                        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#126bff]/10 text-[#126bff]">
                            <i className="fa-solid fa-phone text-2xl"></i>
                        </div>
                        <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-[#111827]'}`}>Sales & Enquiry</h3>
                        <p className={`mt-2 text-sm font-semibold leading-6 ${isDark ? 'text-[#a9adb8]' : 'text-[#667085]'}`}>
                            Our experts are ready to help you find the perfect cooling solution.
                        </p>
                        <a
                            href={`tel:${companyPhone.replace(/\D/g, '')}`}
                            className={`mt-6 block rounded-xl border p-4 text-xl font-black transition hover:border-[#126bff] ${isDark ? 'border-[#30343d] bg-[#151619] text-white' : 'border-[#d9e0ec] bg-[#f8fafc] text-[#111827]'}`}
                        >
                            {companyPhone}
                        </a>
                        <a
                            href="https://maps.google.com/?q=Mitsubishi+Electric+-+Satguru+Engineers,+SCF-29+PH-2,+Sahibzada+Ajit+Singh+Nagar,+Punjab+160055"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-4 block rounded-xl border p-4 text-left text-sm font-bold leading-5 transition hover:border-[#126bff] ${isDark ? 'border-[#30343d] bg-[#151619] text-[#c6cfdf]' : 'border-[#d9e0ec] bg-[#f8fafc] text-[#4f5f76]'}`}
                        >
                            <i className="fa-solid fa-location-dot mr-2 text-[#126bff]"></i>
                            Mitsubishi Electric - Satguru Engineers, SCF-29 PH-2, Sahibzada Ajit Singh Nagar, Punjab 160055
                        </a>
                        <button
                            type="button"
                            onClick={() => setShowPhonePopup(false)}
                            className={`mt-6 h-11 w-full rounded-xl text-sm font-black transition ${isDark ? 'text-[#a9adb8] hover:bg-white/5 hover:text-white' : 'text-[#667085] hover:bg-[#edf2f8] hover:text-[#111827]'}`}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
