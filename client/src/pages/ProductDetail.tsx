import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { APP_NAME } from '../constants';

const ProductDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [selectedModel, setSelectedModel] = React.useState(0);

    // Safely attempt to use auth in case of unauthenticated access on public routes
    let isAuthenticated = false;
    try {
        const auth = useAuth();
        isAuthenticated = auth.isAuthenticated;
    } catch (e) {
        // useAuth throws if not wrapped in provider, which shouldn't happen, but we'll default just in case
    }

    const isGK = id === 'ms-gk';
    const isGRT = id === 'msy-grt';
    const isHP = id === 'msz-hp';
    const isGR = id === 'msy-gr';
    const isRJS = id === 'msy-rjs';

    // Model variants data based on screenshots
    let models = [];

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
                // From model.png
                title: 'MS-AGZ13VF | 1 TR',
                idu: 'MS-AGZ13VF', odu: 'MU-AGZ13VF', capacity: '1.0 Tr', rating: 3,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '3400 W', ratedPower: '872 W',
                iseer: '3.89', current: '3.98', airFlow: '750', noise: '38/39/42/46', refrigerant: 'R32',
                iduDim: '800 x 230 x 295', iduWeight: '9', oduDim: '781 x 241 x 557', oduWeight: '30',
                pipeDia: '12.7/6.35', maxLength: '15', maxElev: '10', mrp: '₹ 44000'
            },
            {
                // From model2.png
                title: 'MS-AGZ18VF | 1.5 TR',
                idu: 'MS-AGZ18VF', odu: 'MU-AGZ18VF', capacity: '1.5 Tr', rating: 3,
                powerSupply: '230 V / 50 Hz / Single Phase', ratedCapacity: '5100 W', ratedPower: '1416 W',
                iseer: '3.60', current: '6.40', airFlow: '850', noise: '41/42/46/50', refrigerant: 'R32',
                iduDim: '800 x 230 x 295', iduWeight: '9.5', oduDim: '781 x 241 x 557', oduWeight: '33',
                pipeDia: '12.7/6.35', maxLength: '15', maxElev: '10', mrp: '₹ 55000'
            },
            {
                // From model3.png
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

    return (
        <div className="min-h-screen bg-white font-sans text-slate-800">
            {/* Header */}
            <header className="border-b border-slate-200 py-4 px-6 flex justify-between items-center bg-white sticky top-0 z-50">
                <Link to="/" className="flex items-center gap-3 transition-transform hover:scale-105">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                        <span className="text-xl font-black text-white">SE</span>
                    </div>
                    <span className="font-bold text-xl tracking-tight text-slate-900">{APP_NAME}</span>
                </Link>
                <Link to="/" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#cc3333] transition-colors group">
                    <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Catalog
                </Link>
            </header>

            {/* Red Product Summary Bar */}
            <div className="bg-[#cc3333] text-white py-6 px-4">
                <div className="max-w-7xl mx-auto flex flex-wrap lg:flex-nowrap divide-y lg:divide-y-0 lg:divide-x divide-white/20 text-center items-center justify-between">
                    <div className="w-full lg:w-auto flex-1 p-4">
                        <div className="text-sm font-medium mb-2 opacity-90">Total Capacity / Model Name</div>
                        <select
                            className="bg-white text-slate-800 py-2 px-4 rounded shadow-sm outline-none w-full max-w-[250px] font-medium mx-auto block cursor-pointer"
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(Number(e.target.value))}
                        >
                            {models.map((m, idx) => (
                                <option key={idx} value={idx}>{m.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-1/2 lg:w-auto flex-1 p-4">
                        <div className="text-sm font-medium mb-1 opacity-90">Capacity</div>
                        <div className="text-xl font-bold">{currentModel.capacity}</div>
                    </div>

                    <div className="w-1/2 lg:w-auto flex-1 p-4 flex flex-col items-center">
                        <div className="text-sm font-medium mb-1 opacity-90">Rating</div>
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-1">
                            <img src={`https://mitsubishielectric.in/assets/images/star-rating/${currentModel.rating}-star.png`} alt={`${currentModel.rating} Star`} className="max-w-full max-h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        </div>
                    </div>

                    <div className="w-1/2 lg:w-auto flex-1 p-4 flex flex-col items-center">
                        <div className="text-sm font-medium mb-1 opacity-90">Refrigerant</div>
                        <div className="w-12 h-12 border-2 border-[#4CAF50] rounded-full flex items-center justify-center text-[#4CAF50] bg-white text-xs font-bold leading-none p-1 text-center flex-col">
                            <span>{currentModel.refrigerant}</span>
                            <span className="text-[8px] font-normal">REFRIGERANT</span>
                        </div>
                    </div>

                    <div className="w-1/2 lg:w-auto flex-1 p-4">
                        <div className="text-sm font-medium mb-1 opacity-90">MRP</div>
                        <div className="text-xl font-bold">{currentModel.mrp}</div>
                    </div>
                </div>
            </div>

            {/* Technical Specifications */}
            <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl md:text-4xl font-bold text-center text-[#cc3333] mb-10">Technical Specifications</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* Column 1: Type */}
                    <div>
                        <table className="w-full border-collapse border border-[#e2e8f0] text-sm">
                            <thead>
                                <tr>
                                    <th className="bg-[#cc3333] text-white text-left p-3 font-semibold border border-[#cc3333]">Type (Cooling)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="p-3 border border-[#e2e8f0] font-bold bg-slate-50 text-[#cc3333]">Indoor Unit</td>
                                </tr>
                                <tr>
                                    <td className="p-3 border border-[#e2e8f0]">{currentModel.idu}</td>
                                </tr>
                                <tr>
                                    <td className="p-3 border border-[#e2e8f0] font-bold bg-slate-50 text-[#cc3333]">Outdoor Unit</td>
                                </tr>
                                <tr>
                                    <td className="p-3 border border-[#e2e8f0]">{currentModel.odu}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Column 2: Performance Output */}
                    <div>
                        <table className="w-full border-collapse border border-[#e2e8f0] text-sm">
                            <thead>
                                <tr>
                                    <th colSpan={2} className="bg-[#cc3333] text-white text-left p-3 font-semibold border border-[#cc3333]">Performance Parameters</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="p-3 border border-[#e2e8f0] text-slate-600">Capacity (Tr)</td>
                                    <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.capacity}</td>
                                </tr>
                                <tr>
                                    <td className="p-3 border border-[#e2e8f0] text-slate-600">Star Rating - As Per BEE</td>
                                    <td className="p-3 border border-[#e2e8f0] font-medium flex items-center gap-2">
                                        {currentModel.rating} Star
                                        <img src={`https://mitsubishielectric.in/assets/images/star-rating/${currentModel.rating}-star.png`} alt={`${currentModel.rating} Star`} className="h-6" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                    </td>
                                </tr>
                                <tr>
                                    <td className="p-3 border border-[#e2e8f0] text-slate-600">Power Supply</td>
                                    <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.powerSupply}</td>
                                </tr>
                                <tr>
                                    <td className="p-3 border border-[#e2e8f0] text-slate-600">{isHP ? 'Cooling Capacity (Rated Min-Max)' : 'Rated Capacity'}</td>
                                    <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.ratedCapacity}</td>
                                </tr>
                                {isHP && (
                                    <tr>
                                        <td className="p-3 border border-[#e2e8f0] text-slate-600">Heating Capacity (Rated Min-Max)</td>
                                        <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.heatingCapacity}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td className="p-3 border border-[#e2e8f0] text-slate-600">{isHP ? 'Total Input (Rated Min-Max)-Cooling' : 'Rated Power Input'}</td>
                                    <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.ratedPower}</td>
                                </tr>
                                {isHP && (
                                    <tr>
                                        <td className="p-3 border border-[#e2e8f0] text-slate-600">Total Input (Rated Min-Max)-Heating</td>
                                        <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.heatingPower}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td className="p-3 border border-[#e2e8f0] text-slate-600">{isGK ? 'EER' : 'ISEER'}</td>
                                    <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.iseer}</td>
                                </tr>
                                <tr>
                                    <td className="p-3 border border-[#e2e8f0] text-slate-600">{isHP ? 'Operating Current (Rated)-Cooling' : 'Rated Current (Amps)'}</td>
                                    <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.current}</td>
                                </tr>
                                {isHP && (
                                    <tr>
                                        <td className="p-3 border border-[#e2e8f0] text-slate-600">Operating Current (Rated)-Heating</td>
                                        <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.heatingCurrent}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td className="p-3 border border-[#e2e8f0] text-slate-600">
                                        {isHP ? 'Air Volume (CFM) Indoor Unit(Low/Mid/High/SHi)-Cooling' : (isGRT || isGR || isRJS) ? 'Air Volume(CFM) Indoor Unit(Silent-Low-Mid-Hi-SHi)' : 'Indoor Air Flow (m3/h) (Turbo/Hi/Mi/Lo)'}
                                    </td>
                                    <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.airFlow}</td>
                                </tr>
                                {isHP && (
                                    <tr>
                                        <td className="p-3 border border-[#e2e8f0] text-slate-600">Air Volume (CFM) Indoor Unit(Low/Mid/High/SHi)-Heating</td>
                                        <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.heatingAirFlow}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td className="p-3 border border-[#e2e8f0] text-slate-600">
                                        {isHP ? 'SPL Indoor Unit(Low/Mid/High/SHi) In dB(A)-Cooling' : (isGRT || isGR || isRJS) ? 'SPL Indoor Unit(Silent-Low-Mid-Hi-SHi) dB(A)' : 'Indoor Noise(Low/Mid/Hi/Turbo Speed)'}
                                    </td>
                                    <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.noise}</td>
                                </tr>
                                {isHP && (
                                    <tr>
                                        <td className="p-3 border border-[#e2e8f0] text-slate-600">SPL Indoor Unit(Low/Mid/High/SHi) In dB(A)-Heating</td>
                                        <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.heatingNoise}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td className="p-3 border border-[#e2e8f0] text-slate-600">Refrigerant</td>
                                    <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.refrigerant}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Column 3: Dimensions */}
                    <div>
                        <table className="w-full border-collapse border border-[#e2e8f0] text-sm">
                            <thead>
                                <tr>
                                    <th colSpan={3} className="bg-[#cc3333] text-white text-left p-3 font-semibold border border-[#cc3333]">Dimensions & Weight</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td rowSpan={2} className="p-3 border border-[#e2e8f0] text-slate-600 w-1/3 align-top">IDU Dimension</td>
                                    <td className="p-3 border border-[#e2e8f0] text-slate-600">Net Dimensions (W x D x H) mm</td>
                                    <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.iduDim}</td>
                                </tr>
                                <tr>
                                    <td className="p-3 border border-[#e2e8f0] text-slate-600">Net Weight kg</td>
                                    <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.iduWeight}</td>
                                </tr>

                                <tr>
                                    <td rowSpan={2} className="p-3 border border-[#e2e8f0] text-slate-600 align-top">Outdoor unit</td>
                                    <td className="p-3 border border-[#e2e8f0] text-slate-600">Net Dim (W * D * H) mm</td>
                                    <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.oduDim}</td>
                                </tr>
                                <tr>
                                    <td className="p-3 border border-[#e2e8f0] text-slate-600">Net Weight kg</td>
                                    <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.oduWeight}</td>
                                </tr>

                                <tr>
                                    <td rowSpan={2} className="p-3 border border-[#e2e8f0] text-slate-600 align-top">Connecting Pipe</td>
                                    <td className="p-3 border border-[#e2e8f0] text-slate-600">Liquid and Gas Side Dia mm</td>
                                    <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.pipeDia}</td>
                                </tr>
                                <tr>
                                    <td className="p-3 border border-[#e2e8f0] text-slate-600">Maximum Length m</td>
                                    <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.maxLength}</td>
                                </tr>
                                <tr>
                                    <td colSpan={2} className="p-3 border border-[#e2e8f0] text-slate-600">Maximum Elevation m</td>
                                    <td className="p-3 border border-[#e2e8f0] font-medium">{currentModel.maxElev}</td>
                                </tr>

                                <tr>
                                    <td colSpan={2} className="p-3 border border-[#e2e8f0] text-slate-600">Ambient Operating Range °C</td>
                                    <td className="p-3 border border-[#e2e8f0] font-medium">48°</td>
                                </tr>
                                <tr>
                                    <td className="p-3 border border-[#e2e8f0] text-slate-600">Installation Kit</td>
                                    <td className="p-3 border border-[#e2e8f0] text-slate-600 text-xs">(Includes Copper Kit/Insulation/Wire)</td>
                                    <td className="p-3 border border-[#e2e8f0] font-medium">Included</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                </div>
            </main>

            <footer className="text-center py-8 text-slate-500 text-sm border-t border-slate-100 mt-12 bg-[#f8fafc]">
                &copy; {new Date().getFullYear()} Satguru Engineers. All rights reserved.
            </footer>
        </div>
    );
};

export default ProductDetail;
