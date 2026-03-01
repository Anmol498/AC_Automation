import React from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME } from '../constants';
import { useAuth } from '../App';

const Home: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [mainTab, setMainTab] = React.useState('split');
    const [activeTab, setActiveTab] = React.useState('inverter');
    const [activePacSeries, setActivePacSeries] = React.useState('inverter');

    // Hardcoded products for catalog based on the screenshot
    const products = [
        // --- SPLIT ACs --- //
        {
            id: 'msz-hp',
            name: 'MSZ-HP',
            category: 'split',
            series: 'winter-summer',
            description: '"Compact, High Performance indoor and outdoor units and advanced inverter technologies provide superior energy savings and comfort in all rooms."',
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
            description: 'GR Series features advanced Inverter Technology that utilize MITSUBISHI ELECTRIC\'s cutting edge technology which ensures faster cooling with high energy efficiency catering to the needs of Indian climatic conditions.',
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
            description: 'Bring refreshing comfort to your home with Mitsubishi Electric\'s fixed-speed AC, designed for optimal cooling and quiet performance.',
            imageUrl: '/MS-AGZ.png'
        },
        {
            id: 'ms-gk',
            name: 'MS-GK',
            category: 'split',
            series: 'non-inverter',
            description: 'Mitsubishi Electric\'s unwavering commitment to research and development is helping us create the next generation of groundbreaking technologies.',
            imageUrl: '/MS-GK.png'
        },

        // --- PAC: CEILING CONCEALED --- //
        {
            id: 'pey-series',
            name: 'PEY Series',
            category: 'pac',
            pacType: 'ceiling-concealed',
            series: 'inverter',
            description: 'New Inverter Technology has made it possible for units to operate at outdoor-air temperatures as high as 52 C. Tropical Specification series units are perfect for cooling homes and offices in tropical regions.',
            imageUrl: '/pey.jpg'
        },
        {
            id: 'pe-m-series',
            name: 'PE-M Series',
            category: 'pac',
            pacType: 'ceiling-concealed',
            series: 'non-inverter',
            description: 'The thin, ceiling-concealed indoor units are perfect answer for the air-conditioning requirements of buildings with minimum ceiling installation space and wide-ranging external static pressure. Available three-stage external static pressure conversions are capable of being set to a maximum of 70Pa.',
            imageUrl: '/pe-m.jpg'
        },

        // --- PAC: CEILING CONCEALED --- //
        {
            id: 'sez-pead-series',
            name: 'SEZ/PEAD Series',
            category: 'pac',
            pacType: 'ceiling-concealed',
            series: 'winter-summer',
            description: 'Ultra thin Ceiling Concealed indoor units of this series are the perfect answer for the air conditioning needs of modern buildings with minimum ceiling installation space requirements and wide-ranging external static pressure. Energy-saving efficiency has been improved, reducing electricity consumption and contributing to a further reduction in operating costs.',
            imageUrl: '/sez.jpeg'
        },

        // --- PAC: CEILING CASSETTE --- //
        {
            id: 'pla-rp-series',
            name: 'PLA-RP Series',
            category: 'pac',
            pacType: 'ceiling-cassette',
            series: 'winter-summer',
            description: 'A complete line-up including deluxe units that offer added energy savings. The incorporation of wide air-outlet and the 3D i-see Sensor enhances airflow distribution control, achieving an enhanced level of comfort throughout the room. The synergy of higher energy efficiency and more comfortable room environment results in the optimum user satisfaction',
            imageUrl: '/pla-rp.jpg'
        },
        {
            id: 'ply-sp-ea',
            name: 'PLY-SP EA',
            category: 'pac',
            pacType: 'ceiling-cassette',
            series: 'inverter',
            description: 'Mitsubishi Electric Inverter series are the perfect answer to today\'s cooling needs. Its Wide-angle outlets distribute air flow to all corners of the room, ensuring the room is sufficiently cooled. Horizontal airflow and a fan speed reduced by 20 percent compared to conventional models also contribute to increased comfort for occupants.',
            imageUrl: '/ply-sp.jpg'
        },
        {
            id: 'pl-m-series',
            name: 'PL-M Series',
            category: 'pac',
            pacType: 'ceiling-cassette',
            series: 'non-inverter',
            description: 'Advanced Non Inverter Ceiling Cassette matching the needs of modern commercial and residential applications.',
            imageUrl: '/pl-m.jpg'
        }
    ];

    const filteredSplitProducts = products.filter(p => p.category === 'split' && p.series === activeTab);
    const filteredPacProducts = products.filter(p => p.category === 'pac' && p.series === activePacSeries);

    return (
        <div className="min-h-screen bg-white font-sans text-slate-800">
            {/* Header / Navigation Bar Placeholder */}
            <header className="border-b border-slate-200 py-4 px-6 flex flex-wrap justify-between items-center gap-y-4 bg-white sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-xl font-black text-white">SE</span>
                    </div>
                    <span className="font-bold text-xl tracking-tight text-slate-900">{APP_NAME}</span>
                </div>
                <div>
                    {isAuthenticated ? (
                        <Link to="/dashboard" className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all" title="Dashboard">
                            <i className="fa-solid fa-gauge text-lg"></i>
                        </Link>
                    ) : (
                        <Link to="/login" className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-500 hover:bg-blue-600 hover:text-white rounded-lg transition-all" title="Staff Login">
                            <i className="fa-solid fa-user-lock text-lg"></i>
                        </Link>
                    )}
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
                {/* Main Category Tabs */}
                <div className="flex justify-center max-w-4xl mx-auto mb-10 px-4">
                    <div className="flex flex-row flex-nowrap bg-slate-100 rounded-lg p-1 w-full shadow-inner relative z-10 overflow-x-auto select-none gap-2 md:gap-0 snap-x hide-scrollbar">
                        <button
                            onClick={() => setMainTab('split')}
                            className={`flex-1 min-w-[30%] md:w-auto text-center py-2 md:py-3 px-2 md:px-4 rounded-md text-sm md:text-base font-medium transition-all duration-300 ${mainTab === 'split' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}>
                            Split
                        </button>
                        <button
                            onClick={() => setMainTab('pac')}
                            className={`flex-1 min-w-[30%] md:w-auto text-center py-2 md:py-3 px-2 md:px-4 rounded-md text-sm md:text-base font-medium transition-all duration-300 ${mainTab === 'pac' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}>
                            PAC
                        </button>
                        <button
                            onClick={() => setMainTab('vrf')}
                            className={`flex-1 min-w-[30%] md:w-auto text-center py-2 md:py-3 px-2 md:px-4 rounded-md text-sm md:text-base font-medium transition-all duration-300 ${mainTab === 'vrf' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}>
                            VRF
                        </button>
                    </div>
                </div>

                {/* Hero Title Section */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900">
                        {mainTab === 'split' ? 'Split Air Conditioners' : mainTab === 'pac' ? 'PAC Air Conditioners' : 'VRF Systems'}
                    </h1>
                    <p className="text-lg text-slate-600">Range Of Most Powerful Yet Elegant Air Conditioners</p>
                </div>

                {mainTab === 'split' ? (
                    <>
                        {/* Tabs */}
                        <div className="flex justify-center max-w-4xl mx-auto mb-16 px-4">
                            <div className="flex flex-row flex-nowrap bg-slate-100 rounded-lg p-1 w-full shadow-inner relative z-10 overflow-x-auto select-none gap-2 md:gap-0 snap-x hide-scrollbar">
                                <button
                                    onClick={() => setActiveTab('inverter')}
                                    className={`flex-1 min-w-[30%] md:w-auto text-center py-3 px-1 md:px-4 rounded-md text-xs sm:text-sm md:text-base font-medium transition-all duration-300 ${activeTab === 'inverter' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}>
                                    Inverter
                                </button>
                                <button
                                    onClick={() => setActiveTab('non-inverter')}
                                    className={`flex-1 min-w-[30%] md:w-auto text-center py-3 px-1 md:px-4 rounded-md text-xs sm:text-sm md:text-base font-medium transition-all duration-300 ${activeTab === 'non-inverter' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}>
                                    Non Inverter
                                </button>
                                <button
                                    onClick={() => setActiveTab('winter-summer')}
                                    className={`flex-1 min-w-[30%] md:w-auto text-center py-3 px-1 md:px-4 rounded-md text-xs sm:text-sm md:text-base font-medium transition-all duration-300 ${activeTab === 'winter-summer' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}>
                                    Hot & Cold
                                </button>
                            </div>
                        </div>

                        {/* Background Banner for Products */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-slate-100 top-20 bottom-0 rounded-xl z-0"></div>

                            {/* Products Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 max-w-5xl mx-auto p-8">
                                {filteredSplitProducts.map((product) => (
                                    <Link to={`/product/${product.id}`} key={product.id} className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full cursor-pointer block">
                                        {/* Energy Rating Badge Placeholder (top right) */}
                                        <div className="p-8 flex justify-center items-center relative aspect-video bg-white">
                                            <div className="absolute top-4 right-4 w-12 h-12 bg-cover bg-center" style={{ backgroundImage: "url('https://mitsubishielectric.in/assets/images/star-rating/3-star.png')" }}></div>
                                            <img
                                                src={product.imageUrl}
                                                alt={product.name}
                                                className="max-h-32 object-contain group-hover:scale-105 transition-transform duration-500 will-change-transform"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=AC+Unit+Image';
                                                }}
                                            />
                                        </div>
                                        <div className="p-8 border-t border-slate-100 flex-grow flex flex-col">
                                            <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">{product.name}</h3>
                                            <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-grow">{product.description}</p>
                                            <span className="text-red-600 font-medium text-sm self-start group-hover:text-red-700 flex items-center gap-2 mt-auto">
                                                View Specifications
                                                <i className="fa-solid fa-arrow-right-long group-hover:translate-x-1 transition-transform"></i>
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </>
                ) : mainTab === 'pac' ? (
                    <>
                        {/* PAC Series Tabs */}
                        <div className="flex justify-center max-w-4xl mx-auto mb-16 px-4">
                            <div className="flex flex-row flex-nowrap bg-slate-100 rounded-lg p-1 w-full shadow-inner relative z-10 overflow-x-auto select-none gap-2 md:gap-0 snap-x hide-scrollbar">
                                <button
                                    onClick={() => setActivePacSeries('inverter')}
                                    className={`flex-1 min-w-[30%] md:w-auto text-center py-3 px-1 md:px-4 rounded-md text-xs sm:text-sm md:text-base font-medium transition-all duration-300 ${activePacSeries === 'inverter' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}>
                                    Inverter
                                </button>
                                <button
                                    onClick={() => setActivePacSeries('non-inverter')}
                                    className={`flex-1 min-w-[30%] md:w-auto text-center py-3 px-1 md:px-4 rounded-md text-xs sm:text-sm md:text-base font-medium transition-all duration-300 ${activePacSeries === 'non-inverter' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}>
                                    Non Inverter
                                </button>
                                <button
                                    onClick={() => setActivePacSeries('winter-summer')}
                                    className={`flex-1 min-w-[30%] md:w-auto text-center py-3 px-1 md:px-4 rounded-md text-xs sm:text-sm md:text-base font-medium transition-all duration-300 ${activePacSeries === 'winter-summer' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}>
                                    Hot & Cold
                                </button>
                            </div>
                        </div>

                        {/* Background Banner for Products */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-slate-100 top-20 bottom-0 rounded-xl z-0"></div>

                            {/* Products Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 max-w-5xl mx-auto p-8">
                                {filteredPacProducts.length > 0 ? (
                                    filteredPacProducts.map((product) => (
                                        <Link to={`/product/${product.id}`} key={product.id} className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full cursor-pointer block">
                                            {/* Energy Rating Badge Placeholder (top right) */}
                                            <div className="p-8 flex justify-center items-center relative aspect-video bg-white">
                                                <div className="absolute top-4 right-4 w-12 h-12 bg-cover bg-center" style={{ backgroundImage: "url('https://mitsubishielectric.in/assets/images/star-rating/3-star.png')" }}></div>
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="max-h-32 object-contain group-hover:scale-105 transition-transform duration-500 will-change-transform"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=AC+Unit+Image';
                                                    }}
                                                />
                                            </div>
                                            <div className="p-8 border-t border-slate-100 flex-grow flex flex-col">
                                                <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">{product.name}</h3>
                                                <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-grow">{product.description}</p>
                                                <span className="text-blue-600 font-medium text-sm self-start group-hover:text-blue-700 flex items-center gap-2 mt-auto">
                                                    View Specifications
                                                    <i className="fa-solid fa-arrow-right-long group-hover:translate-x-1 transition-transform"></i>
                                                </span>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="col-span-1 md:col-span-2 text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm mt-8">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <i className="fa-solid fa-box-open text-2xl text-slate-400"></i>
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-2">No Products Available</h3>
                                        <p className="text-slate-500">We currently don't have any products listed in this specific category.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : mainTab === 'vrf' ? (
                    <div className="text-center py-24 bg-white rounded-2xl border border-slate-100 shadow-sm mx-auto max-w-3xl">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i className="fa-solid fa-person-digging text-3xl text-slate-400"></i>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-3">Coming Soon</h2>
                        <p className="text-slate-500 px-8">We are currently curating our catalog with the latest VRF Systems. Please check back later.</p>
                    </div>
                ) : null}
            </main>

            {/* Footer / Info */}
            <footer className="text-center py-8 text-slate-500 text-sm border-t border-slate-100 mt-12 bg-white">
                &copy; {new Date().getFullYear()} Satguru Engineers. All rights reserved.
            </footer>
        </div>
    );
};

export default Home;
