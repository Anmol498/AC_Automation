import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { APP_NAME } from '../constants';

const ProductDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [selectedModel, setSelectedModel] = React.useState(0);
    const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);
    const [showPhonePopup, setShowPhonePopup] = React.useState(false);

    React.useEffect(() => {
        setSelectedImageIndex(0);
        setShowPhonePopup(false);
    }, [id]);

    let isAuthenticated = false;
    try {
        const auth = useAuth();
        isAuthenticated = auth.isAuthenticated;
    } catch (e) {
        // useAuth throws if not wrapped in provider
    }

    const isGK = id === 'ms-gk';
    const isGRT = id === 'msy-grt';
    const isHP = id === 'msz-hp';
    const isGR = id === 'msy-gr';
    const isRJS = id === 'msy-rjs';

    let models: any[] = [];

    if (isGK) {
        models = [
            {
                title: 'MS-GK13VA | 1 TR',
                idu: 'MS-GK13VA', odu: 'MU-GK13VA', capacity: '1.0 Tr', rating: 2,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '3.6 kW', ratedPower: '1.000 kW',
                iseer: '3.60', current: '4.5', airFlow: '477', noise: '29/36/42/46', refrigerant: 'R410A',
                iduDim: '290 x 799 x 232', iduWeight: '10', oduDim: '525 x 718 x 255', oduWeight: '33.5',
                pipeDia: '6.35/12.7', maxLength: '20', maxElev: '10', mrp: '₹ 55560'
            },
            {
                title: 'MS-GK18VA | 1.5 TR',
                idu: 'MS-GK18VA', odu: 'MU-GK18VA', capacity: '1.5 Tr', rating: 2,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '5.2 kW', ratedPower: '1.450 kW',
                iseer: '3.59', current: '6.4', airFlow: '777', noise: '35/41/47/53', refrigerant: 'R410A',
                iduDim: '325 x 1100 x 238', iduWeight: '16', oduDim: '550 x 800 x 285', oduWeight: '40',
                pipeDia: '6.35/15.88', maxLength: '30', maxElev: '10', mrp: '₹ 69360'
            },
            {
                title: 'MS-GK24VA | 1.9 TR',
                idu: 'MS-GK24VA', odu: 'MU-GK24VA', capacity: '1.9 Tr', rating: 2,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '6.6 kW', ratedPower: '1.850 kW',
                iseer: '3.57', current: '8.2', airFlow: '777', noise: '37/42/47/53', refrigerant: 'R410A',
                iduDim: '325 x 1100 x 238', iduWeight: '16', oduDim: '880 x 840 x 330', oduWeight: '63',
                pipeDia: '6.35/15.88', maxLength: '30', maxElev: '10', mrp: '₹ 88320'
            }
        ];
    } else if (isGRT) {
        models = [
            {
                title: 'MSY-GR13VFT-DA1 | 1 TR',
                idu: 'MSY-GR13VFT-DA1', odu: 'MUY-GR13VFT-DA1', capacity: '1.0 Tr', rating: 5,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '3.7 (1.4-4.1)kW', ratedPower: '1.01(0.32-1.31)kW',
                iseer: '5.02', current: '4.8', airFlow: '152/187/254/335/448', noise: '19/24/31/38/43', refrigerant: 'R32',
                iduDim: '280 x 838 x 229', iduWeight: '10', oduDim: '538 x 699 x 249', oduWeight: '24.5',
                pipeDia: '6.35/9.52', maxLength: '20', maxElev: '12', mrp: '₹ 65100'
            },
            {
                title: 'MSY-GR18VFT-DA1 | 1.5 TR',
                idu: 'MSY-GR18VFT-DA1', odu: 'MUY-GR18VFT-DA1', capacity: '1.5 Tr', rating: 5,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '5.2(1.8-6.0)kW', ratedPower: '1.36(0.33-1.53)kW',
                iseer: '5.00', current: '6.2', airFlow: '318/396/466/554/717', noise: '27/33/38/44/49', refrigerant: 'R32',
                iduDim: '325 x 1100 x 257', iduWeight: '17', oduDim: '714 x 800 x 285', oduWeight: '38',
                pipeDia: '6.35/12.7', maxLength: '30', maxElev: '15', mrp: '₹ 81400'
            },
            {
                title: 'MSY-GR22VFT-DA1 | 1.9 TR',
                idu: 'MSY-GR22VFT-DA1', odu: 'MUY-GR22VFT-DA1', capacity: '1.9 Tr', rating: 5,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '6.6(1.8-7.2)kW', ratedPower: '1.72(0.33-2.15)kW',
                iseer: '5.00', current: '7.6', airFlow: '339/424/512/597/784', noise: '28/36/41/45/51', refrigerant: 'R32',
                iduDim: '325 x 1100 x 257', iduWeight: '17', oduDim: '714 x 800 x 285', oduWeight: '38',
                pipeDia: '6.35/15.88', maxLength: '30', maxElev: '15', mrp: '₹ 92400'
            }
        ];
    } else if (isGR) {
        models = [
            {
                title: 'MSY-GR10VF-DA1 | 0.8 TR',
                idu: 'MSY-GR10VF-DA1', odu: 'MUY-GR10VF-DA1', capacity: '0.8 Tr', rating: 5,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '2.8(1.1-3.4)kW', ratedPower: '0.76(0.23-1.07)kW',
                iseer: '5.00', current: '3.8', airFlow: '141/187/254/335/403', noise: '18/24/31/38/42', refrigerant: 'R32',
                iduDim: '280 x 838 x 229', iduWeight: '10', oduDim: '538 x 699 x 249', oduWeight: '21.5',
                pipeDia: '6.35/9.52', maxLength: '20', maxElev: '12', mrp: '₹ 51450'
            },
            {
                title: 'MSY-GR13VF-DA1 | 1 TR',
                idu: 'MSY-GR13VF-DA1', odu: 'MUY-GR13VF-DA1', capacity: '1.0 Tr', rating: 5,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '3.7(1.4-4.1)kW', ratedPower: '1.01(0.32-1.31)kW',
                iseer: '5.02', current: '4.8', airFlow: '152/187/254/335/445', noise: '19/24/31/38/43', refrigerant: 'R32',
                iduDim: '280 x 838 x 229', iduWeight: '10', oduDim: '538 x 699 x 249', oduWeight: '24.5',
                pipeDia: '6.35/9.52', maxLength: '20', maxElev: '12', mrp: '₹ 57750'
            },
            {
                title: 'MSY-GR18VF-DA1 | 1.5 TR',
                idu: 'MSY-GR18VF-DA1', odu: 'MUY-GR18VF-DA1', capacity: '1.5 Tr', rating: 5,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '5.2(1.8-6.0)kW', ratedPower: '1.36(0.34-1.84)kW',
                iseer: '5.00', current: '6.2', airFlow: '318/396/466/554/710', noise: '27/33/38/44/49', refrigerant: 'R32',
                iduDim: '325 x 1100 x 257', iduWeight: '17', oduDim: '550 x 800 x 285', oduWeight: '31.5',
                pipeDia: '6.35/12.7', maxLength: '20', maxElev: '12', mrp: '₹ 72000'
            },
            {
                title: 'MSY-GR22VFT-DA1 | 1.9 TR',
                idu: 'MSY-GR22VFT-DA1', odu: 'MUY-GR22VFT-DA1', capacity: '1.9 Tr', rating: 5,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '6.6(1.8-7.2)kW', ratedPower: '1.72(0.33-2.15)kW',
                iseer: '5.00', current: '7.6', airFlow: '339/424/512/597/784', noise: '28/36/41/45/51', refrigerant: 'R32',
                iduDim: '325 x 1100 x 257', iduWeight: '17', oduDim: '714 x 800 x 285', oduWeight: '38',
                pipeDia: '6.35/15.88', maxLength: '30', maxElev: '15', mrp: '₹ 92400'
            },
            {
                title: 'MSY-GR26VF-DA1 | 2.2 TR',
                idu: 'MSY-GR26VF-DA1', odu: 'MUY-GR26VF-DA1', capacity: '2.2 Tr', rating: 4,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '7.6(2.1-9.2)kW', ratedPower: '2.09(0.45-3.33)kW',
                iseer: '4.80', current: '9.2', airFlow: '346/452/540/625/809', noise: '30/37/42/46/53', refrigerant: 'R32',
                iduDim: '325 x 1100 x 257', iduWeight: '17', oduDim: '880 x 840 x 330', oduWeight: '48',
                pipeDia: '6.35/15.88', maxLength: '30', maxElev: '15', mrp: '₹ 105000'
            }
        ];
    } else if (isRJS) {
        models = [
            {
                title: 'MSY-RJS13VF | 1 TR',
                idu: 'MSY-RJS13VF', odu: 'MUY-RJS13VF', capacity: '1.0 Tr', rating: 3,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '3.6(0.9-3.7)kW', ratedPower: '1.27(0.30-1.35)kW',
                iseer: '4.15', current: '6', airFlow: '190/247/331/397/452', noise: '22/28/36/40/43', refrigerant: 'R32',
                iduDim: '280 x 838 x 228', iduWeight: '8.5', oduDim: '538 x 699 x 249', oduWeight: '21',
                pipeDia: '6.35/9.52', maxLength: '20', maxElev: '12', mrp: '₹ 53000'
            },
            {
                title: 'MSY-RJS15VF | 1.25 TR',
                idu: 'MSY-RJS15VF', odu: 'MUY-RJS15VF', capacity: '1.25 Tr', rating: 3,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '4.2(1.2-4.2)kW', ratedPower: '1.44(0.35-1.59)kW',
                iseer: '4.23', current: '6.7', airFlow: '197/274/352/419/471', noise: '26/31/37/42/46', refrigerant: 'R32',
                iduDim: '280 x 838 x 228', iduWeight: '8.5', oduDim: '538 x 699 x 249', oduWeight: '24.5',
                pipeDia: '6.35/9.52', maxLength: '20', maxElev: '12', mrp: '₹ 57000'
            },
            {
                title: 'MSY-RJS18VF | 1.5 TR',
                idu: 'MSY-RJS18VF', odu: 'MUY-RJS18VF', capacity: '1.5 Tr', rating: 3,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '5.2(1.5-5.7)kW', ratedPower: '1.68(0.35-2.04)kW',
                iseer: '4.23', current: '7.5', airFlow: '230/297/392/459/569', noise: '26/33/40/44/49', refrigerant: 'R32',
                iduDim: '305 x 923 x 262', iduWeight: '11.5', oduDim: '550 x 800 x 285', oduWeight: '31.5',
                pipeDia: '6.35/12.7', maxLength: '20', maxElev: '12', mrp: '₹ 67300'
            },
            {
                title: 'MSY-RJS22VF | 1.9 TR',
                idu: 'MSY-RJS22VF', odu: 'MUY-RJS22VF', capacity: '1.9 Tr', rating: 3,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '6.6(1.6-6.7)kW', ratedPower: '2.01(0.34-2.20)kW',
                iseer: '4.22', current: '9.1', airFlow: '300/399/487/576/660', noise: '27/37/41/45/51', refrigerant: 'R32',
                iduDim: '305 x 923 x 262', iduWeight: '12.5', oduDim: '714 x 800 x 285', oduWeight: '37.0',
                pipeDia: '6.35/12.7', maxLength: '30', maxElev: '15', mrp: '₹ 76700'
            }
        ];
    } else if (isHP) {
        models = [
            {
                title: 'MSZ-HP13VA | 1 TR',
                idu: 'MSZ-HP13VA', odu: 'MUZ-HP13VA', capacity: '1.0 Tr', rating: 2,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '3.15(1.4-3.50)kW', ratedPower: '1.04(0.36-1.27)kW',
                iseer: '3.62', current: '5.1(A)', airFlow: '134/204/278/386', noise: '22/31/38/45', refrigerant: 'R410A',
                iduDim: '290 x 799 x 232', iduWeight: '9', oduDim: '538 x 699 x 249', oduWeight: '25.0',
                pipeDia: '6.35/9.52', maxLength: '20', maxElev: '12', mrp: '₹ 58800',
                heatingCapacity: '3.60(1.1-4.10)kW', heatingPower: '0.995(0.37-1.2)kW', heatingCurrent: '4.7(A)', heatingAirFlow: '122/195/270/366', heatingNoise: '23/30/37/44'
            },
            {
                title: 'MSZ-HP18VA | 1.5 TR',
                idu: 'MSZ-HP18VA', odu: 'MUZ-HP18VA', capacity: '1.5 Tr', rating: 4,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '5.20(1.7-5.60)kW', ratedPower: '1.57(0.42-1.95)kW',
                iseer: '4.63', current: '7.0(A)', airFlow: '331/428/524/620', noise: '28/36/40/45', refrigerant: 'R410A',
                iduDim: '305 x 923 x 250', iduWeight: '13', oduDim: '550 x 800 x 285', oduWeight: '36',
                pipeDia: '6.35/12.7', maxLength: '20', maxElev: '12', mrp: '₹ 78800',
                heatingCapacity: '5.40(1.4-6.50)kW', heatingPower: '1.48(0.27-2.03)kW', heatingCurrent: '6.6(A)', heatingAirFlow: '311/428/524/620', heatingNoise: '27/34/41/47'
            },
            {
                title: 'MSZ-HP24VA | 2 TR',
                idu: 'MSZ-HP24VA', odu: 'MUZ-HP24VA', capacity: '2.0 Tr', rating: 3,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '7.10(1.8-7.10)kW', ratedPower: '2.33(0.30-2.33)kW',
                iseer: '4.20', current: '10.3(A)', airFlow: '352/428/524/696', noise: '33/38/44/50', refrigerant: 'R410A',
                iduDim: '305 x 923 x 250', iduWeight: '13', oduDim: '880 x 840 x 330', oduWeight: '55',
                pipeDia: '9.52/15.88', maxLength: '30', maxElev: '15', mrp: '₹ 97100',
                heatingCapacity: '8.10(1.5-8.50)kW', heatingPower: '2.44(0.29-2.70)kW', heatingCurrent: '10.8(A)', heatingAirFlow: '366/448/573/710', heatingNoise: '33/38/44/49'
            }
        ];
    } else {
        models = [
            {
                title: 'MS-AGZ13VF | 1 TR',
                idu: 'MS-AGZ13VF', odu: 'MU-AGZ13VF', capacity: '1.0 Tr', rating: 3,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '3400 W', ratedPower: '872 W',
                iseer: '3.89', current: '3.98', airFlow: '750', noise: '38/39/42/46', refrigerant: 'R32',
                iduDim: '800 x 230 x 295', iduWeight: '9', oduDim: '781 x 241 x 557', oduWeight: '30',
                pipeDia: '12.7/6.35', maxLength: '15', maxElev: '10', mrp: '₹ 44000'
            },
            {
                title: 'MS-AGZ18VF | 1.5 TR',
                idu: 'MS-AGZ18VF', odu: 'MU-AGZ18VF', capacity: '1.5 Tr', rating: 3,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '5100 W', ratedPower: '1416 W',
                iseer: '3.60', current: '6.40', airFlow: '850', noise: '41/42/46/50', refrigerant: 'R32',
                iduDim: '800 x 230 x 295', iduWeight: '9.5', oduDim: '781 x 241 x 557', oduWeight: '33',
                pipeDia: '12.7/6.35', maxLength: '15', maxElev: '10', mrp: '₹ 55000'
            },
            {
                title: 'MS-AGZ22VF | 2 TR',
                idu: 'MS-AGZ22VF', odu: 'MU-AGZ22VF', capacity: '2.0 Tr', rating: 3,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '6400 W', ratedPower: '1882 W',
                iseer: '3.40', current: '8.50', airFlow: '1000', noise: '44/46/50/54', refrigerant: 'R32',
                iduDim: '800 x 230 x 295', iduWeight: '10', oduDim: '781 x 241 x 557', oduWeight: '35',
                pipeDia: '15.88/6.35', maxLength: '15', maxElev: '10', mrp: '₹ 66000'
            }
        ];
    }

    const currentModel = models[selectedModel];
    const rawCapacity = currentModel.capacity.replace(' Tr', '');

    const productImages = isGK ? [
        '/MS-GK.png',
        '/images/gk/gk1.png',
        '/images/gk/gk2.png',
        '/images/gk/gk3.png',
        '/images/gk/gk4.png',
        '/images/gk/gk5.png',
        '/images/gk/gk6.png'
    ] : isGRT ? [
        '/msy-grt.jpg',
        '/images/grt/grt (1).png',
        '/images/grt/grt (2).png',
        '/images/grt/grt (3).png',
        '/images/grt/grt (4).png',
        '/images/grt/grt (5).png',
        '/images/grt/grt (6).png',
        '/images/grt/grt (7).png',
        '/images/grt/grt (8).png',
        '/images/grt/grt (9).png',
        '/images/grt/grt (10).png',
        '/images/grt/grt (11).png',
        '/images/grt/grt (12).png'
    ] :
        isHP ? [
            '/msz-hp.jpg',
            '/images/hp/hp1.png',
            '/images/hp/hp2.png',
            '/images/hp/hp3.png',
            '/images/hp/hp4.png',
            '/images/hp/hp5.png',
            '/images/hp/hp6.png'
        ] :
            isGR ? [
                '/msy-gr.jpg',
                '/images/gr/gr1.png',
                '/images/gr/gr2.png',
                '/images/gr/gr3.png',
                '/images/gr/gr4.png',
                '/images/gr/gr5.png',
                '/images/gr/gr6.png',
                '/images/gr/gr7.png',
                '/images/gr/gr8.png',
                '/images/gr/gr9.png',
                '/images/gr/gr10.png',
                '/images/gr/gr11.png',
                '/images/gr/gr12.png'
            ] :
                isRJS ? [
                    '/msy-rjs.png',
                    '/images/rjs/rjs1.png',
                    '/images/rjs/rjs2.png',
                    '/images/rjs/rjs3.png',
                    '/images/rjs/rjs4.png',
                    '/images/rjs/rjs5.png',
                    '/images/rjs/rjs6.png',
                    '/images/rjs/rjs7.png',
                    '/images/rjs/rjs8.png',
                    '/images/rjs/rjs9.png',
                    '/images/rjs/rjs10.png',
                    '/images/rjs/rjs11.png',
                    '/images/rjs/rjs12.png',
                    '/images/rjs/rjs13.png',
                    '/images/rjs/rjs14.png'
                ] :
                    ['/MS-AGZ.png'];

    return (
        <div className="bg-background-light text-slate-800 min-h-screen transition-colors duration-300 font-sans">
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-500/20">SE</div>
                        <span className="font-display font-bold text-xl tracking-tight text-slate-900 uppercase">{APP_NAME}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary transition-colors" to="/">
                            <span className="material-icons-outlined text-[20px]">arrow_back</span>
                            Back to Catalog
                        </Link>
                        {isAuthenticated && (
                            <>
                                <div className="h-6 w-px bg-slate-200 mx-2" />
                                <Link to="/staff" className="bg-primary hover:bg-red-700 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-lg shadow-red-900/20">
                                    Staff Portal
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid lg:grid-cols-2 gap-12 items-center mb-12">
                    <div className="relative group w-full max-w-full overflow-hidden">
                        <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-2xl group-hover:bg-primary/10 transition-all" />
                        <img
                            alt={`Sleek Modern Split AC Unit - ${currentModel.idu}`}
                            className="relative z-10 w-full max-h-[300px] md:max-h-none h-auto drop-shadow-2xl rounded-2xl bg-white p-4 object-contain aspect-square md:aspect-auto mix-blend-multiply"
                            src={productImages[selectedImageIndex] || productImages[0]}
                        />
                        {productImages.length > 1 && (
                            <div className="relative z-10 flex gap-3 mt-6 overflow-x-auto pb-4 snap-x hide-scrollbar w-full">
                                {productImages.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImageIndex(idx)}
                                        className={`snap-center shrink-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl bg-white border-2 overflow-hidden transition-all ${selectedImageIndex === idx
                                            ? 'border-primary ring-4 ring-primary/10 shadow-md'
                                            : 'border-slate-100 opacity-60 hover:opacity-100 hover:border-slate-300'
                                            }`}
                                    >
                                        <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-contain p-2 mix-blend-multiply" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-6">
                        <div>
                            <div>
                                <div>
                                    <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider rounded-full mb-3">MS Series - Inverter</span>
                                    <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight font-display mb-4">{currentModel.idu}</h1>
                                </div>

                                <div className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded-xl border border-slate-100 max-w-sm mt-2">
                                    <span className="text-slate-500 font-medium pl-2">Model Selector:</span>
                                    <select
                                        className="flex-1 bg-white border-slate-200 rounded-lg text-sm font-semibold focus:ring-primary focus:border-primary px-3 py-2 outline-none shadow-sm cursor-pointer"
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(Number(e.target.value))}
                                    >
                                        {models.map((m, idx) => (
                                            <option key={idx} value={idx}>{m.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <p className="text-lg text-slate-500 mt-2 leading-relaxed font-body">
                                Engineered for silence and efficiency. The series combines precision with tropical climate endurance, delivering rapid cooling even at high temperatures.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0 p-4 md:p-6 bg-white rounded-2xl border border-slate-100 shadow-sm mx-auto w-full">
                            <div className="flex flex-col gap-1 p-2 md:p-0">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Capacity</span>
                                <div className="flex items-end gap-1">
                                    <span className="text-2xl font-bold text-slate-900">{rawCapacity}</span>
                                    <span className="text-sm font-medium text-slate-500 mb-1">Tr</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1 md:border-l md:border-slate-100 md:pl-4 p-2 md:p-0">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rating</span>
                                <div className="flex items-center">
                                    {currentModel.rating >= 2 ? (
                                        <img src={`/${currentModel.rating}-star.png`} alt={`${currentModel.rating} Star Rating`} className="h-6 object-contain" />
                                    ) : (
                                        <span className="text-sm font-bold text-slate-900">{currentModel.rating > 0 ? `${currentModel.rating}-Star` : 'N/A'}</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1 md:border-l md:border-slate-100 md:pl-4 p-2 md:p-0">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Refrigerant</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-xl font-bold text-slate-900 uppercase">{currentModel.refrigerant}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1 md:border-l md:border-slate-100 md:pl-4 p-2 md:p-0">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price (MRP)</span>
                                <div className="text-2xl font-bold text-primary max-w-full overflow-hidden text-ellipsis whitespace-nowrap" title={currentModel.mrp}>{currentModel.mrp}</div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setShowPhonePopup(true)} className="flex-1 bg-slate-900 text-white font-bold py-4 px-6 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                                <span className="material-icons-outlined text-[20px]">phone</span>
                                Enquire Now
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-12 border-t border-slate-200">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 font-display">Technical Specifications</h2>
                            <p className="text-slate-500 mt-1">Detailed engineering data for professional installation.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                <div className="bg-primary px-6 py-4">
                                    <h3 className="text-white font-bold uppercase tracking-wider text-sm font-body">Unit Identification</h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    <div className="p-4 px-6">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Indoor Unit</label>
                                        <div className="text-lg font-bold text-slate-900">{currentModel.idu}</div>
                                    </div>
                                    <div className="p-4 px-6">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Outdoor Unit</label>
                                        <div className="text-lg font-bold text-slate-900">{currentModel.odu}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-1 border border-slate-100 rounded-2xl overflow-hidden self-start">
                            <div className="bg-white shadow-sm">
                                <div className="bg-slate-800 px-6 py-4">
                                    <h3 className="text-white font-bold uppercase tracking-wider text-sm">Performance Parameters</h3>
                                </div>
                                <table className="w-full text-left border-collapse">
                                    <tbody>
                                        <tr className="table-row-even border-b border-slate-100">
                                            <td className="p-4 px-6 text-sm font-medium text-slate-500">Capacity (Tr)</td>
                                            <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.capacity}</td>
                                        </tr>
                                        <tr className="border-b border-slate-100 bg-white">
                                            <td className="p-4 px-6 text-sm font-medium text-slate-500">BEE Star Rating</td>
                                            <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.rating} Star</td>
                                        </tr>
                                        <tr className="table-row-even border-b border-slate-100">
                                            <td className="p-4 px-6 text-sm font-medium text-slate-500">Power Supply</td>
                                            <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.powerSupply}</td>
                                        </tr>
                                        <tr className="border-b border-slate-100 bg-white">
                                            <td className="p-4 px-6 text-sm font-medium text-slate-500">{isHP ? 'Cooling Capacity (Rated Min-Max)' : 'Rated Capacity'}</td>
                                            <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.ratedCapacity}</td>
                                        </tr>
                                        {isHP && (
                                            <tr className="table-row-even border-b border-slate-100">
                                                <td className="p-4 px-6 text-sm font-medium text-slate-500">Heating Capacity (Min-Max)</td>
                                                <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.heatingCapacity}</td>
                                            </tr>
                                        )}
                                        <tr className="table-row-even border-b border-slate-100 bg-slate-50">
                                            <td className="p-4 px-6 text-sm font-medium text-slate-500">{isHP ? 'Total Input (Cooling)' : 'Rated Power Input'}</td>
                                            <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.ratedPower}</td>
                                        </tr>
                                        {isHP && (
                                            <tr className="border-b border-slate-100 bg-white">
                                                <td className="p-4 px-6 text-sm font-medium text-slate-500">Total Input (Heating)</td>
                                                <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.heatingPower}</td>
                                            </tr>
                                        )}
                                        <tr className="border-b border-slate-100 bg-white">
                                            <td className="p-4 px-6 text-sm font-medium text-slate-500">{isGK ? 'EER' : 'ISEER'}</td>
                                            <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.iseer}</td>
                                        </tr>
                                        <tr className="table-row-even border-b border-slate-100 bg-slate-50">
                                            <td className="p-4 px-6 text-sm font-medium text-slate-500">{isHP ? 'Current (Cooling)' : 'Rated Current'}</td>
                                            <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.current} {isHP ? '' : 'Amps'}</td>
                                        </tr>
                                        {isHP && (
                                            <tr className="border-b border-slate-100 bg-white">
                                                <td className="p-4 px-6 text-sm font-medium text-slate-500">Current (Heating)</td>
                                                <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.heatingCurrent}</td>
                                            </tr>
                                        )}
                                        <tr className="border-b border-slate-100 bg-white">
                                            <td className="p-4 px-6 text-sm font-medium text-slate-500">Indoor Air Flow (m3/h)</td>
                                            <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.airFlow}</td>
                                        </tr>
                                        {isHP && (
                                            <tr className="table-row-even border-b border-slate-100">
                                                <td className="p-4 px-6 text-sm font-medium text-slate-500">Air Flow (Heating)</td>
                                                <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.heatingAirFlow}</td>
                                            </tr>
                                        )}
                                        <tr className="table-row-even border-b border-slate-100 bg-slate-50">
                                            <td className="p-4 px-6 text-sm font-medium text-slate-500">Indoor Noise (dB(A))</td>
                                            <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.noise}</td>
                                        </tr>
                                        {isHP && (
                                            <tr className="border-b border-slate-100 bg-white">
                                                <td className="p-4 px-6 text-sm font-medium text-slate-500">Noise (Heating)</td>
                                                <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.heatingNoise}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="lg:col-span-1 border border-slate-100 rounded-2xl overflow-hidden self-start">
                            <div className="bg-white shadow-sm">
                                <div className="bg-slate-800 px-6 py-4">
                                    <h3 className="text-white font-bold uppercase tracking-wider text-sm">Dimensions & Weight</h3>
                                </div>
                                <table className="w-full text-left border-collapse">
                                    <tbody>
                                        <tr className="bg-slate-50">
                                            <td colSpan={2} className="p-4 px-6 text-xs font-bold text-primary uppercase tracking-tighter">Indoor Unit (IDU)</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="p-4 px-6 text-sm font-medium text-slate-500">Net Dim (WxDxH) mm</td>
                                            <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.iduDim}</td>
                                        </tr>
                                        <tr className="table-row-even bg-slate-50 border-b border-slate-100">
                                            <td className="p-4 px-6 text-sm font-medium text-slate-500">Net Weight</td>
                                            <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.iduWeight} kg</td>
                                        </tr>

                                        <tr className="bg-slate-50">
                                            <td colSpan={2} className="p-4 px-6 text-xs font-bold text-primary uppercase tracking-tighter">Outdoor Unit (ODU)</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="p-4 px-6 text-sm font-medium text-slate-500">Net Dim (WxDxH) mm</td>
                                            <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.oduDim}</td>
                                        </tr>
                                        <tr className="table-row-even bg-slate-50 border-b border-slate-100">
                                            <td className="p-4 px-6 text-sm font-medium text-slate-500">Net Weight</td>
                                            <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.oduWeight} kg</td>
                                        </tr>

                                        <tr className="bg-slate-50">
                                            <td colSpan={2} className="p-4 px-6 text-xs font-bold text-primary uppercase tracking-tighter">Installation Details</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="p-4 px-6 text-sm font-medium text-slate-500">Ambient Op Range</td>
                                            <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">Up to 48°C / 52°C</td>
                                        </tr>
                                        <tr className="table-row-even bg-slate-50 border-b border-slate-100">
                                            <td className="p-4 px-6 text-sm font-medium text-slate-500">Piping Dia (Gas/Liq)</td>
                                            <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.pipeDia}</td>
                                        </tr>
                                        <tr className="table-row-even bg-slate-50">
                                            <td className="p-4 px-6 text-sm font-medium text-slate-500">Max Length/Elevation</td>
                                            <td className="p-4 px-6 text-sm font-bold text-slate-900 text-right">{currentModel.maxLength}m / {currentModel.maxElev}m</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="mt-20 border-t border-slate-200 py-12 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-2 grayscale opacity-60">
                            <div className="w-8 h-8 bg-slate-400 rounded-md flex items-center justify-center text-white font-bold text-sm">SE</div>
                            <span className="font-display font-bold text-sm tracking-tight text-slate-600 uppercase">{APP_NAME}</span>
                        </div>
                        <p className="text-sm text-slate-500">
                            © {new Date().getFullYear()} {APP_NAME}. All rights reserved. Precision cooling solutions.
                        </p>
                        <div className="flex gap-6">
                            <a href="#" className="text-slate-400 hover:text-primary transition-colors text-sm">Privacy Policy</a>
                            <a href="#" className="text-slate-400 hover:text-primary transition-colors text-sm">Support</a>
                            <a href="#" className="text-slate-400 hover:text-primary transition-colors text-sm">Contact</a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Phone Enquiry Modal */}
            {showPhonePopup && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowPhonePopup(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary shadow-inner">
                            <span className="material-icons-outlined text-4xl">phone_in_talk</span>
                        </div>
                        <h3 className="text-2xl font-display font-bold text-slate-900 mb-2">Sales & Enquiry</h3>
                        <p className="text-slate-500 mb-8 text-sm px-4">Our experts are ready to help you find the perfect cooling solution.</p>

                        <a href="tel:09592292292" className="block w-full bg-slate-50 border border-slate-200 hover:border-primary/50 hover:bg-primary/5 rounded-2xl p-4 transition-all mb-4 group cursor-pointer shadow-sm hover:shadow-md">
                            <div className="text-3xl font-bold tracking-wider text-slate-800 group-hover:text-primary transition-colors flex items-center justify-center gap-2">
                                <span className="material-icons-outlined text-primary">phone</span>
                                95922 92292
                            </div>
                            <div className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest flex items-center justify-center gap-1">
                                <span className="material-icons-outlined text-[14px]">touch_app</span>
                                Tap to Call
                            </div>
                        </a>

                        <a href="https://maps.google.com/?q=Mitsubishi+Electric+-+Satguru+Engineers,+SEF-29+PH-2,+Sahibzada+Ajit+Singh+Nagar,+Punjab+160055" target="_blank" rel="noopener noreferrer" className="block w-full bg-slate-50 border border-slate-200 hover:border-blue-500/50 hover:bg-blue-50/50 rounded-2xl p-4 transition-all mb-6 group cursor-pointer shadow-sm hover:shadow-md">
                            <div className="text-sm font-bold tracking-tight text-slate-800 group-hover:text-blue-600 transition-colors flex items-start text-left gap-3">
                                <span className="material-icons-outlined text-blue-500 shrink-0 mt-0.5">place</span>
                                <span>Mitsubishi Electric - Satguru Engineers, SEF-29 PH-2, Sahibzada Ajit Singh Nagar, Punjab 160055</span>
                            </div>
                            <div className="text-xs font-bold text-slate-400 mt-3 uppercase tracking-widest flex items-center justify-center gap-1">
                                <span className="material-icons-outlined text-[14px]">directions</span>
                                Open in Maps
                            </div>
                        </a>

                        <button
                            onClick={() => setShowPhonePopup(false)}
                            className="w-full py-4 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors rounded-xl hover:bg-slate-100"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductDetail;
