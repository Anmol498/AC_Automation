import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth, useSettings } from '../context/AppContext';
import { APP_NAME } from '../constants';
import CustomSelect from '../components/CustomSelect';


const ProductDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { companyPhone } = useSettings();
    const [selectedModel, setSelectedModel] = React.useState(0);
    const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);
    const [showPhonePopup, setShowPhonePopup] = React.useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);

    React.useEffect(() => {
        setSelectedImageIndex(0);
        setShowPhonePopup(false);
        setIsImageModalOpen(false);
    }, [id]);

    let isAuthenticated = false;
    let setLoginModalOpen: (open: boolean) => void = () => {};
    try {
        const auth = useAuth();
        isAuthenticated = auth.isAuthenticated;
        setLoginModalOpen = auth.setLoginModalOpen;
    } catch (e) {
        // useAuth throws if not wrapped in provider
    }

    const topbarBlue = '#246BFF';
    const [isDark, setIsDark] = React.useState(() => {
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

    const isGK = id === 'ms-gk';
    const isGRT = id === 'msy-grt';
    const isHP = id === 'msz-hp';
    const isGR = id === 'msy-gr';
    const isRJS = id === 'msy-rjs';
    const isPLY = id === 'ply-sp-ea';
    const isPEY = id === 'pey-series';
    const isPLM = id === 'pl-m-series';
    const isPEM = id === 'pe-m-series';
    const isPLA = id === 'pla-rp-series';
    const isSEZ = id === 'sez-pead-series';

    let models: any[] = [];

    if (isPLY) {
        models = [
            {
                title: 'PLY-SP18EA | 1.5 TR',
                idu: 'PLY-SP18EA', odu: 'SUY-SA18VA2', capacity: '1.5 Tr', rating: 4,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 1ph 220-240V 50Hz', ratedCapacity: '5.2(2.8-5.3)kW', ratedPower: '1.60kW',
                iseer: '4.50', current: '', airFlow: '565/600/670/740', noise: '28/30/32/35', refrigerant: 'R410A',
                iduDim: '258(40) x 840(950) x 840(950)', iduWeight: '21(5)', oduDim: '550 x 800 x 285', oduWeight: '32',
                pipeDia: '6.35/12.7', maxLength: '20', maxElev: '12', mrp: '₹ 106800'
            },
            {
                title: 'PLY-SP24EA | 2 TR',
                idu: 'PLY-SP24EA', odu: 'SUY-SA24VA2', capacity: '2.0 Tr', rating: 4,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 1ph 220-240V 50Hz', ratedCapacity: '7.1(2.9-7.1)kW', ratedPower: '2.17kW',
                iseer: '4.50', current: '', airFlow: '565/635/740/810', noise: '28/31/34/37', refrigerant: 'R410A',
                iduDim: '258(40) x 840(950) x 840(950)', iduWeight: '21(5)', oduDim: '880 x 840 x 330', oduWeight: '49',
                pipeDia: '9.52/15.88', maxLength: '30', maxElev: '15', mrp: '₹ 117100'
            },
            {
                title: 'PLY-SP30EA | 2.5 TR',
                idu: 'PLY-SP30EA', odu: 'SUY-SA30VA2', capacity: '2.5 Tr', rating: 4,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 1ph 220-240V 50Hz', ratedCapacity: '8.8(4.1-8.8)kW', ratedPower: '2.48kW',
                iseer: '4.50', current: '', airFlow: '670/810/920/1025', noise: '31/34/37/41', refrigerant: 'R410A',
                iduDim: '298(40) x 840(950) x 840(950)', iduWeight: '24(5)', oduDim: '880 x 840 x 330', oduWeight: '50',
                pipeDia: '9.52/15.88', maxLength: '30', maxElev: '15', mrp: '₹ 135200'
            },
            {
                title: 'PLY-SP36EA | 3 TR',
                idu: 'PLY-SP36EA', odu: 'PUY-SP36YKA2', capacity: '3.0 Tr', rating: 0,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 3ph 380-415V 50Hz', ratedCapacity: '10.6(4.0-10.6)kW', ratedPower: '3.52kW',
                iseer: '4.30', current: '', airFlow: '740/885/990/1095', noise: '32/37/41/43', refrigerant: 'R410A',
                iduDim: '298(40) x 840(950) x 840(950)', iduWeight: '27(5)', oduDim: '981 x 1050 x 330', oduWeight: '65',
                pipeDia: '9.52/15.88', maxLength: '50', maxElev: '30', mrp: '₹ 170900'
            },
            {
                title: 'PLY-SP48EA | 4 TR',
                idu: 'PLY-SP48EA', odu: 'PUY-SP48YKA2', capacity: '4.0 Tr', rating: 0,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 3ph 380-415V 50Hz', ratedCapacity: '14.1(7.0-14.1)kW', ratedPower: '6.02kW',
                iseer: '3.54', current: '', airFlow: '850/920/1025/1130', noise: '36/39/42/44', refrigerant: 'R410A',
                iduDim: '298(40) x 840(950) x 840(950)', iduWeight: '27(5)', oduDim: '981 x 1050 x 330', oduWeight: '73',
                pipeDia: '9.52/15.88', maxLength: '50', maxElev: '30', mrp: '₹ 222300'
            }
        ];
    } else if (isPEY) {
        models = [
            {
                title: 'PEY-SP18JA2 | 1.5 TR',
                idu: 'PEY-SP18JA', odu: 'SUY-SA18VA', capacity: '1.5 Tr', rating: 0,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 1ph 220-240V 50Hz', ratedCapacity: '5.3(2.6-5.3)kW', ratedPower: '1.72kW',
                iseer: '3.08', current: '', airFlow: '425/510/600', noise: '30/35/39', refrigerant: 'R410A',
                iduDim: '250 x 900 x 732', iduWeight: '27', oduDim: '550 x 800 x 285', oduWeight: '32',
                pipeDia: '6.35/12.7', maxLength: '20', maxElev: '12', mrp: '₹ 92400'
            },
            {
                title: 'PEY-SP24JA2 | 2 TR',
                idu: 'PEY-SP24JA', odu: 'SUY-SA24VA', capacity: '2.0 Tr', rating: 0,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 1ph 220-240V 50Hz', ratedCapacity: '7.1(2.9-7.1)kW', ratedPower: '2.16kW',
                iseer: '3.28', current: '', airFlow: '635/740/885', noise: '30/34/39', refrigerant: 'R410A',
                iduDim: '250 x 1100 x 732', iduWeight: '29', oduDim: '880 x 840 x 330', oduWeight: '49',
                pipeDia: '9.52/15.88', maxLength: '30', maxElev: '15', mrp: '₹ 101700'
            },
            {
                title: 'PEY-SP30JA2 | 2.5 TR',
                idu: 'PEY-SP30JA', odu: 'SUY-SA30VA', capacity: '2.5 Tr', rating: 0,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 1ph 220-240V 50Hz', ratedCapacity: '8.8(3.6-8.8)kW', ratedPower: '2.50kW',
                iseer: '3.52', current: '', airFlow: '850/1025/1200', noise: '33/38/42', refrigerant: 'R410A',
                iduDim: '250 x 1400 x 732', iduWeight: '38', oduDim: '880 x 840 x 330', oduWeight: '50',
                pipeDia: '9.52/15.88', maxLength: '30', maxElev: '15', mrp: '₹ 119800'
            },
            {
                title: 'PEY-SP36JA2 | 3 TR',
                idu: 'PEY-SP36JA', odu: 'PUY-SP36YKA', capacity: '3.0 Tr', rating: 0,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 3ph 380-415V 50Hz', ratedCapacity: '10.6(4.8-10.6)kW', ratedPower: '3.66kW',
                iseer: '2.90', current: '', airFlow: '1040/1225/1465', noise: '36/40/44', refrigerant: 'R410A',
                iduDim: '250 x 1400 x 732', iduWeight: '39', oduDim: '981 x 1050 x 330', oduWeight: '65',
                pipeDia: '9.52/15.88', maxLength: '50', maxElev: '30', mrp: '₹ 158800'
            },
            {
                title: 'PEY-SP48JA2 | 4 TR',
                idu: 'PEY-SP48JA', odu: 'PUY-SP48YKA', capacity: '4.0 Tr', rating: 0,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 3ph 380-415V 50Hz', ratedCapacity: '14.1(7.8-14.1)kW', ratedPower: '5.73kW',
                iseer: '2.46', current: '', airFlow: '1040/1225/1465', noise: '36/40/44', refrigerant: 'R410A',
                iduDim: '250 x 1400 x 732', iduWeight: '39', oduDim: '981 x 1050 x 330', oduWeight: '73',
                pipeDia: '9.52/15.88', maxLength: '50', maxElev: '30', mrp: '₹ 220000'
            }
        ];
    } else if (isPLM) {
        models = [
            {
                title: 'PL-M18BAK-DA | 1.5 TR',
                idu: 'PL-M18BAK-DA', odu: 'PU-M18VAK-DA', capacity: '1.5 Tr', rating: 0,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 1ph 220-240V 50Hz', ratedCapacity: '5.45kW', ratedPower: '1.56kW',
                iseer: '3.49', current: '', airFlow: '495-565-635-705', noise: '28-30-33-35', refrigerant: 'R32',
                iduDim: '258(35) x 840(950) x 840(950)', iduWeight: '23(5)', oduDim: '525 x 718 x 255', oduWeight: '35',
                pipeDia: '6.35/12.7', maxLength: '35', maxElev: '20', mrp: '₹ 96000'
            },
            {
                title: 'PL-M24BAK-DA | 2 TR',
                idu: 'PL-M24BAK-DA', odu: 'PU-M24VAK-DA', capacity: '2.0 Tr', rating: 0,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 1ph 220-240V 50Hz', ratedCapacity: '6.80kW', ratedPower: '2.00kW',
                iseer: '3.40', current: '', airFlow: '495-565-635-705', noise: '28-30-33-35', refrigerant: 'R32',
                iduDim: '258(35) x 840(950) x 840(950)', iduWeight: '23(5)', oduDim: '880 x 840 x 330', oduWeight: '51',
                pipeDia: '6.35/15.88', maxLength: '35', maxElev: '20', mrp: '₹ 102000'
            },
            {
                title: 'PL-M30BAK-DA | 2.5 TR',
                idu: 'PL-M30BAK-DA', odu: 'PU-M30VAK-DA', capacity: '2.5 Tr', rating: 0,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 1ph 220-240V 50Hz', ratedCapacity: '8.80kW', ratedPower: '2.54kW',
                iseer: '3.46', current: '', airFlow: '670-775-885-990', noise: '32-35-39-42', refrigerant: 'R32',
                iduDim: '298(35) x 840(950) x 840(950)', iduWeight: '25(5)', oduDim: '880 x 840 x 330', oduWeight: '63',
                pipeDia: '9.52/15.88', maxLength: '50', maxElev: '30', mrp: '₹ 120000'
            },
            {
                title: 'PL-M36BAK-DA | 3 TR',
                idu: 'PL-M36BAK-DA', odu: 'PU-M36YAK-DA', capacity: '3.0 Tr', rating: 0,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 3ph 380-415V 50Hz', ratedCapacity: '10.60kW', ratedPower: '3.30kW',
                iseer: '3.21', current: '', airFlow: '705-850-955-1060', noise: '33-37-40-43', refrigerant: 'R32',
                iduDim: '298(35) x 840(950) x 840(950)', iduWeight: '27(5)', oduDim: '981 x 1050 x 330', oduWeight: '82',
                pipeDia: '9.52/15.88', maxLength: '50', maxElev: '30', mrp: '₹ 148000'
            },
            {
                title: 'PL-M48BAK-DA | 4 TR',
                idu: 'PL-M48BAK-DA', odu: 'PU-M48YAK-DA', capacity: '4.0 Tr', rating: 0,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 3ph 380-415V 50Hz', ratedCapacity: '14.10kW', ratedPower: '5.22kW',
                iseer: '2.70', current: '', airFlow: '850-920-1025-1130', noise: '38-40-42-45', refrigerant: 'R32',
                iduDim: '298(35) x 840(950) x 840(950)', iduWeight: '27(5)', oduDim: '981 x 1050 x 330', oduWeight: '85',
                pipeDia: '9.52/15.88', maxLength: '50', maxElev: '30', mrp: '₹ 184000'
            }
        ];
    } else if (isPEM) {
        models = [
            {
                title: 'PE-M18JAK-DA | 1.5 TR',
                idu: 'PE-M18JAK-DA', odu: 'PU-M18VAK-DA', capacity: '1.5 Tr', rating: 0,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 1ph 220-240V 50Hz', ratedCapacity: '5.45kW', ratedPower: '1.63kW',
                iseer: '3.35', current: '', airFlow: '618-953', noise: '30-38', refrigerant: 'R32',
                iduDim: '250 x 1100 x 732', iduWeight: '29', oduDim: '525 x 718 x 255', oduWeight: '35',
                pipeDia: '6.35/12.7', maxLength: '35', maxElev: '20', mrp: '₹ 85900'
            },
            {
                title: 'PE-M24JAK-DA | 2 TR',
                idu: 'PE-M24JAK-DA', odu: 'PU-M24VAK-DA', capacity: '2.0 Tr', rating: 0,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 1ph 220-240V 50Hz', ratedCapacity: '6.60kW', ratedPower: '2.10kW',
                iseer: '3.14', current: '', airFlow: '618-953', noise: '30-38', refrigerant: 'R32',
                iduDim: '250 x 1100 x 732', iduWeight: '29', oduDim: '880 x 840 x 330', oduWeight: '51',
                pipeDia: '6.35/15.88', maxLength: '35', maxElev: '20', mrp: '₹ 90800'
            },
            {
                title: 'PE-M30JAK-DA | 2.5 TR',
                idu: 'PE-M30JAK-DA', odu: 'PU-M30VAK-DA', capacity: '2.5 Tr', rating: 0,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 1ph 220-240V 50Hz', ratedCapacity: '8.80kW', ratedPower: '2.67kW',
                iseer: '3.30', current: '', airFlow: '848-1200', noise: '34-42', refrigerant: 'R32',
                iduDim: '250 x 1400 x 732', iduWeight: '38', oduDim: '880 x 840 x 330', oduWeight: '63',
                pipeDia: '9.52/15.88', maxLength: '50', maxElev: '30', mrp: '₹ 111200'
            },
            {
                title: 'PE-M36JAK-DA | 3 TR',
                idu: 'PE-M36JAK-DA', odu: 'PU-M36YAK-DA', capacity: '3.0 Tr', rating: 0,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 3ph 380-415V 50Hz', ratedCapacity: '10.40kW', ratedPower: '3.35kW',
                iseer: '3.10', current: '', airFlow: '848-1200', noise: '34-45', refrigerant: 'R32',
                iduDim: '250 x 1400 x 732', iduWeight: '38', oduDim: '981 x 1050 x 330', oduWeight: '82',
                pipeDia: '9.52/15.88', maxLength: '50', maxElev: '30', mrp: '₹ 147300'
            },
            {
                title: 'PE-M48JAK-DA | 4 TR',
                idu: 'PE-M48JAK-DA', odu: 'PU-M48YAK-DA', capacity: '4.0 Tr', rating: 0,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 3ph 380-415V 50Hz', ratedCapacity: '14.10kW', ratedPower: '5.22kW',
                iseer: '2.70', current: '', airFlow: '989-1483', noise: '36-44', refrigerant: 'R32',
                iduDim: '250 x 1400 x 732', iduWeight: '38', oduDim: '981 x 1050 x 330', oduWeight: '85',
                pipeDia: '9.52/15.88', maxLength: '50', maxElev: '30', mrp: '₹ 219400'
            }
        ];
    } else if (isPLA) {
        models = [
            {
                title: 'PLA-RP50EA-DA | 1.5 TR',
                idu: 'PLA-RP50EA', odu: 'SUZ-KA50VA', panel: 'PLP-6EALM-DA', capacity: '1.5 Tr', rating: 0,
                powerSupply: '1ph 220-240V 50Hz',
                coolingCapacity: '5.5(2.3-5.6)kW', coolingPower: '1.61kW', eer: '3.41 WM', iseer: '4.50 WM',
                heatingCapacity: '5.0(1.7-7.2)kW', heatingPower: '1.69kW', cop: '3.43 WM',
                iduFinish: 'Munsell 1.0Y 9.2/0.2', oduFinish: 'Munsell 3.0Y 7.8/1.1',
                refrigerantControl: 'Linear Expansion Valve',
                iduAirflow: '14-15-17-19 / 495-565-600-635 (CMM / CFM)', oduAirflow: '44.6 / 1575 (CMM / CFM)',
                externalStaticPressuse: '0 (direct blow) Pa',
                operationControl: 'Remote control & Built in',
                iduNoise: '27-29-31-32 dB(A)', oduNoise: '52 dB(A)',
                unitDrainPipe: '32 mm',
                iduDimPanel: 'Outer: 840(950) x 840(950) x 258(40) mm', iduWeightPanel: '19(5) kg',
                oduDim: '840 x 330 x 880 mm', oduWeight: '54 kg',
                maxHeight: '30 m', maxLength: '30 m',
                pipeSize: 'Liquid 6.35/Gas 12.7 mm', mrp: '₹ 132000'
            },
            {
                title: 'PLA-RP71EA-DA | 2 TR',
                idu: 'PLA-RP71EA', odu: 'SUZ-KA71VA', panel: 'PLP-6EALM-DA', capacity: '2.0 Tr', rating: 0,
                powerSupply: '1ph 220-240V 50Hz',
                coolingCapacity: '7.1(2.8-8.1)kW', coolingPower: '2.10kW', eer: '3.38 WM', iseer: '4.51 WM',
                heatingCapacity: '8.0(2.6-10.2)kW', heatingPower: '2.24kW', cop: '3.56 WM',
                iduFinish: 'Munsell 1.0Y 9.2/0.2', oduFinish: 'Munsell 3.0Y 7.8/1.1',
                refrigerantControl: 'Linear Expansion Valve',
                iduAirflow: '16-17-19-21 / 565-600-670-740 (CMM / CFM)', oduAirflow: '50.1 / 1770 (CMM / CFM)',
                externalStaticPressuse: '0 (direct blow) Pa',
                operationControl: 'Remote control & Built in',
                iduNoise: '28-30-32-34 dB(A)', oduNoise: '55 dB(A)',
                unitDrainPipe: '32 mm',
                iduDimPanel: 'Outer: 840(950) x 840(950) x 258(40) mm', iduWeightPanel: '21(5) kg',
                oduDim: '840 x 330 x 880 mm', oduWeight: '53 kg',
                maxHeight: '30 m', maxLength: '30 m',
                pipeSize: 'Liquid 9.52/Gas 15.88 mm', mrp: '₹ 159700'
            },
            {
                title: 'PLA-RP100EA-DA | 3 TR',
                idu: 'PLA-RP100EA', odu: 'PUHZ-P100YKA', panel: 'PLP-6EALM-DA', capacity: '3.0 Tr', rating: 0,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 3ph 380-415V 50Hz',
                coolingCapacity: '9.4(3.7-10.6)kW', coolingPower: '3.18kW', eer: '2.95 WM', iseer: '',
                heatingCapacity: '11.2(2.8-12.5)kW', heatingPower: '3.26kW', cop: '3.43 WM',
                iduFinish: 'Munsell 1.0Y 9.2/0.2', oduFinish: 'Munsell 3.0Y 7.8/1.1',
                refrigerantControl: 'Linear Expansion Valve',
                iduAirflow: '19-23-26-29 / 670-810-920-1025 (CMM / CFM)', oduAirflow: '79 / 2792 (CMM / CFM)',
                externalStaticPressuse: '0 (direct blow) Pa',
                operationControl: 'Remote control & Built in',
                iduNoise: '31-34-37-40 dB(A)', oduNoise: '51 dB(A)',
                unitDrainPipe: '32 mm',
                iduDimPanel: 'Outer: 840(950) x 840(950) x 298(40) mm', iduWeightPanel: '24(5) kg',
                oduDim: '1050 x 330(40) x 981 mm', oduWeight: '78 kg',
                maxHeight: '30 m', maxLength: '50 m',
                pipeSize: 'Liquid 9.52/Gas 15.88 mm', mrp: '₹ 204700'
            },
            {
                title: 'PLA-RP140EA-DA | 4 TR',
                idu: 'PLA-RP140EA', odu: 'PUHZ-P140YKA', panel: 'PLP-6EALM-DA', capacity: '4.0 Tr', rating: 0,
                powerSupply: 'Indoor: 1ph 220-240V 50Hz, Outdoor: 3ph 380-415V 50Hz',
                coolingCapacity: '13.6(5.8-14.1)kW', coolingPower: '5.41kW', eer: '2.51 WM', iseer: '',
                heatingCapacity: '15.0(4.5-16.0)kW', heatingPower: '4.67kW', cop: '3.21 WM',
                iduFinish: 'Munsell 1.0Y 9.2/0.2', oduFinish: 'Munsell 3.0Y 7.8/1.1',
                refrigerantControl: 'Linear Expansion Valve',
                iduAirflow: '24-26-29-32 / 850-920-1025-1130 (CMM / CFM)', oduAirflow: '86 / 3039 (CMM / CFM)',
                externalStaticPressuse: '0 (direct blow) Pa',
                operationControl: 'Remote control & Built in',
                iduNoise: '36-39-42-44 dB(A)', oduNoise: '56 dB(A)',
                unitDrainPipe: '32 mm',
                iduDimPanel: 'Outer: 840(950) x 840(950) x 298(40) mm', iduWeightPanel: '27(5) kg',
                oduDim: '1050 x 330(40) x 981 mm', oduWeight: '85 kg',
                maxHeight: '30 m', maxLength: '50 m',
                pipeSize: 'Liquid 9.52/Gas 15.88 mm', mrp: '₹ 264700'
            }
        ];
    } else if (isSEZ) {
        models = [
            {
                title: '1.5 Tr',
                capacity: '1.5',
                rating: 0,
                powerSupply: '1ph 220-240V 50Hz',
                mrp: '₹ 110900',
                idu: 'SEZ-KD50VAL',
                odu: 'SUZ-KA50VA-DA',
                coolingCapacity: '5.1 (2.3-5.2) kW',
                coolingPower: '1.580 kW',
                eer: '3.22 W/W',
                iseer: '-',
                heatingCapacity: '6.4 (1.7-7.2) kW',
                heatingPower: '1.800 kW',
                cop: '3.55 W/W',
                iduFinish: 'Galvanized sheets',
                iduAirflow: '10.0-12.5-15.0 / 353-441-530 (CMM / CFM)',
                externalStaticPressuse: '5 / 15 / 35 / 50 Pa',
                operationControl: 'Remote Control Built in',
                iduNoise: '30-34-37 dB(A)',
                unitDrainPipe: '32 mm',
                iduDimPanel: '990 x 700 x 200 mm',
                iduWeightPanel: '22 kg',
                oduFinish: 'Munsell 3.0Y 7.8/1.1',
                refrigerantControl: 'Linear Expansion Valve',
                oduAirflow: '44.6 / 1574 (CMM / CFM)',
                oduNoise: '52 dB(A)',
                oduDim: '840 x 330 x 880 mm',
                oduWeight: '54 kg',
                maxHeight: '30 m',
                maxLength: '30 m',
                pipeSize: 'Liquid 6.35/Gas 12.7 mm'
            },
            {
                title: '2.0 Tr',
                capacity: '2.0',
                rating: 0,
                powerSupply: '1ph 220-240V 50Hz',
                mrp: '₹ 147000',
                idu: 'PEAD-RP71JALQ',
                odu: 'SUZ-KA71VA-DA',
                coolingCapacity: '7.1 (2.8-8.1) kW',
                coolingPower: '2.08 kW',
                eer: '3.41 W/W',
                iseer: '-',
                heatingCapacity: '8.0 (2.6-10.2) kW',
                heatingPower: '2.04 kW',
                cop: '3.92 W/W',
                iduFinish: 'Galvanized steel plate',
                iduAirflow: '17.5-21-25 / 618-742-883 (CMM / CFM)',
                externalStaticPressuse: '35/50/70/100/150 Pa',
                operationControl: 'Built in',
                iduNoise: '26-30-34 dB(A)',
                unitDrainPipe: '32 mm',
                iduDimPanel: '1100 x 732 x 250 mm',
                iduWeightPanel: '29 kg',
                oduFinish: 'Munsell 3.0Y 7.8/1.1',
                refrigerantControl: 'Linear Expansion Valve',
                oduAirflow: '50.1 / 1770 (CMM / CFM)',
                oduNoise: '55 dB(A)',
                oduDim: '840 x 330 x 880 mm',
                oduWeight: '53 kg',
                maxHeight: '30 m',
                maxLength: '30 m',
                pipeSize: 'Liquid 9.52/Gas 15.88 mm'
            },
            {
                title: '3.0 Tr',
                capacity: '3.0',
                rating: 0,
                powerSupply: '1ph 220-240V 50Hz',
                mrp: '₹ 192000',
                idu: 'PEAD-RP100JALQ-PA',
                odu: 'PUHZ-P100YKA',
                coolingCapacity: '9.4 (3.7-10.6) kW',
                coolingPower: '2.98 kW',
                eer: '3.15 W/W',
                iseer: '-',
                heatingCapacity: '11.2 (2.8-12.5) kW',
                heatingPower: '2.94 kW',
                cop: '3.80 W/W',
                iduFinish: 'Galvanized steel plate',
                iduAirflow: '24-29-34 / 848-1024-1200 (CMM / CFM)',
                externalStaticPressuse: '35/50/70/100/150 Pa',
                operationControl: 'Built in',
                iduNoise: '29-34-38 dB(A)',
                unitDrainPipe: '32 mm',
                iduDimPanel: '1400 x 732 x 250 mm',
                iduWeightPanel: '38 kg',
                oduFinish: 'Munsell 3.0Y 7.8/1.1',
                refrigerantControl: 'Linear Expansion Valve',
                oduAirflow: '79 / 2792 (CMM / CFM)',
                oduNoise: '51 dB(A)',
                oduDim: '1050 x 330 (+40) x 981 mm',
                oduWeight: '78 kg',
                maxHeight: '30 m',
                maxLength: '50 m',
                pipeSize: 'Liquid 9.52/Gas 15.88 mm'
            },
            {
                title: '4.0 Tr',
                capacity: '4.0',
                rating: 0,
                powerSupply: '1ph 220-240V 50Hz',
                mrp: '₹ 261200',
                idu: 'PEAD-RP140JALQ-PA',
                odu: 'PUHZ-P140YKA',
                coolingCapacity: '13.6 (5.8-14.1) kW',
                coolingPower: '5.21 kW',
                eer: '2.61 W/W',
                iseer: '-',
                heatingCapacity: '15.0 (4.9-15.8) kW',
                heatingPower: '4.27 kW',
                cop: '3.51 W/W',
                iduFinish: 'Galvanized steel plate',
                iduAirflow: '32-39-46 / 1130-1377-1624 (CMM / CFM)',
                externalStaticPressuse: '35/50/70/100/150 Pa',
                operationControl: 'Built in',
                iduNoise: '34-38-43 dB(A)',
                unitDrainPipe: '32 mm',
                iduDimPanel: '1600 x 732 x 250 mm',
                iduWeightPanel: '43 kg',
                oduFinish: 'Munsell 3.0Y 7.8/1.1',
                refrigerantControl: 'Linear Expansion Valve',
                oduAirflow: '86 / 3039 (CMM / CFM)',
                oduNoise: '56 dB(A)',
                oduDim: '1050 x 330 (+40) x 981 mm',
                oduWeight: '85 kg',
                maxHeight: '30 m',
                maxLength: '50 m',
                pipeSize: 'Liquid 9.52/Gas 15.88 mm'
            }
        ];
    } else if (isGK) {
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

    const seriesSubtitle = isPLY ? 'PLY Series - Inverter' :
        isPEY ? 'PEY Series - Inverter' :
            isPLM ? 'PL-M Series - Non Inverter' :
                isPEM ? 'PE-M Series - Non Inverter' :
                    isPLA ? 'PLA-RP Series - Inverter (Hot & Cold)' :
                        isSEZ ? 'SEZ/PEAD Series - Inverter (Hot & Cold)' :
                            isGK ? 'MS-GK Series - Non Inverter' :
                                isGRT ? 'MSY-GRT Series - Inverter' :
                                    isHP ? 'MSZ-HP Series - Inverter (Hot & Cold)' :
                                        isGR ? 'MSY-GR Series - Inverter' :
                                            isRJS ? 'Kirigamine Series - Inverter' : 'MS-AGZ Series - Non Inverter';

    const currentModel = models[selectedModel];
    const rawCapacity = currentModel.capacity.replace(' Tr', '');

    const productImages = isPLY ? [
        '/ply-sp.jpg',
        '/ply1.png',
        '/ply2.png',
        '/ply3.png',
        '/ply4.png',
        '/ply5.png'
    ] : isPEY ? [
        '/pey.jpg',
        '/pey1.png',
        '/pey2.png',
        '/pey3.png',
        '/pey4.png'
    ] : isPLM ? [
        '/pl-m.jpg',
        '/pl1.png',
        '/pl2.png',
        '/pl3.png',
        '/pl4.png',
        '/pl5.png',
        '/pl6.png'
    ] : isPEM ? [
        '/pe-m.jpg',
        '/pe-m1.png',
        '/pe-m2.png',
        '/pe-m3.png',
        '/pe-m4.png',
        '/pe-m5.png'
    ] : isPLA ? [
        '/pla-rp.jpg',
        '/pla1.png',
        '/pla2.png',
        '/pla3.png',
        '/pla4.png'
    ] : isSEZ ? [
        '/sez.jpeg',
        '/sez/sez0.png',
        '/sez/sez1.png',
        '/sez/sez2.png'
    ] : isGK ? [
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
                    [
                        '/MS-AGZ.png',
                        '/images/agz/agz1.png',
                        '/images/agz/agz2.png',
                        '/images/agz/agz3.png',
                        '/images/agz/agz4.png',
                        '/images/agz/agz5.png',
                        '/images/agz/agz6.png',
                        '/images/agz/agz7.png',
                        '/images/agz/agz8.png',
                        '/images/agz/agz9.png',
                        '/images/agz/agz10.png',
                        '/images/agz/agz11.png',
                        '/images/agz/agz12.png',
                        '/images/agz/agz13.png',
                        '/images/agz/agz14.png'
                    ];

    return (
        <div className={`min-h-screen transition-colors duration-300 font-sans ${isDark ? 'bg-[#151619] text-slate-300' : 'bg-background-light text-slate-800'}`}>
            <header className={`sticky top-0 z-50 border-b px-6 transition-colors duration-300 sm:px-8 backdrop-blur-md ${isDark ? 'border-[#202125] bg-[#101112]/80' : 'border-[#e4e8f0] bg-white/80'}`}>
                <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 sm:gap-5 hover:opacity-90 transition-opacity">
                        <img src="/logo.png" alt={`${APP_NAME} Logo`} className="h-8 w-auto object-contain opacity-75" />
                        <span className={`hidden sm:block text-[22px] font-black uppercase leading-none tracking-[-0.02em] sm:text-[30px] ${isDark ? 'text-white' : 'text-[#111827]'}`}>
                            {APP_NAME}
                        </span>
                    </Link>

                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link
                            to="/"
                            className={`flex h-10 items-center gap-2 rounded-full border px-5 text-sm font-extrabold transition ${isDark ? 'border-[#24262b] bg-[#18191b] text-[#126bff] hover:bg-[#202226]' : 'border-[#D7E3FF] bg-white hover:border-[#C7D8FF] hover:bg-[#EEF4FF]'}`}
                            style={!isDark ? { color: topbarBlue } : undefined}
                        >
                            <i className="fa-solid fa-house text-sm"></i>
                            <span className="hidden sm:inline">Home</span>
                        </Link>
                        <Link
                            to="/contact"
                            className={`flex h-10 items-center gap-2 rounded-full border px-5 text-sm font-extrabold transition ${isDark ? 'border-[#24262b] bg-[#18191b] text-[#126bff] hover:bg-[#202226]' : 'border-[#D7E3FF] bg-white hover:border-[#C7D8FF] hover:bg-[#EEF4FF]'}`}
                            style={!isDark ? { color: topbarBlue } : undefined}
                        >
                            <i className="fa-solid fa-envelope text-sm"></i>
                            <span className="hidden sm:inline">Contact Us</span>
                        </Link>
                        {isAuthenticated ? (
                            <Link
                                to="/dashboard"
                                className={`flex h-10 items-center gap-2 rounded-full border px-5 text-sm font-extrabold transition ${isDark ? 'border-[#24262b] bg-[#18191b] text-[#126bff] hover:bg-[#202226]' : 'border-[#D7E3FF] bg-white hover:border-[#C7D8FF] hover:bg-[#EEF4FF]'}`}
                                style={!isDark ? { color: topbarBlue } : undefined}
                            >
                                <i className="fa-solid fa-square-poll-horizontal text-sm"></i>
                                <span>Dashboard</span>
                            </Link>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setLoginModalOpen(true)}
                                className={`flex h-10 items-center gap-2 rounded-full border px-5 text-sm font-extrabold transition ${isDark ? 'border-[#24262b] bg-[#18191b] text-[#126bff] hover:bg-[#202226]' : 'border-[#D7E3FF] bg-white hover:border-[#C7D8FF] hover:bg-[#EEF4FF]'}`}
                                style={!isDark ? { color: topbarBlue } : undefined}
                            >
                                <i className="fa-solid fa-right-to-bracket text-sm"></i>
                                <span>Login</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6 flex">
                    <Link
                        to="/"
                        className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
                            isDark
                                ? 'bg-[#1a1c20] border-[#2a2e36] text-slate-400 hover:text-white hover:bg-[#252830] hover:border-slate-600'
                                : 'bg-white border-slate-200 text-slate-600 hover:text-brand-blue hover:bg-slate-50 hover:border-slate-300'
                        }`}
                        title="Back to Catalog"
                    >
                        <span className="material-icons-outlined text-[20px]">arrow_back</span>
                    </Link>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 items-center mb-12">
                    <div className="relative group w-full max-w-full overflow-hidden">
                        <div className="absolute -inset-4 bg-blue-600/5 rounded-3xl blur-2xl group-hover:bg-blue-600/10 transition-all" />
                        <img
                            alt={`Sleek Modern Split AC Unit - ${currentModel.idu}`}
                            className={`relative z-10 w-full max-h-[300px] md:max-h-none h-auto drop-shadow-2xl rounded-2xl bg-white p-4 object-contain aspect-square md:aspect-auto cursor-pointer hover:scale-[1.02] transition-transform duration-300 ${isDark ? '' : 'mix-blend-multiply'}`}
                            src={productImages[selectedImageIndex] || productImages[0]}
                            onClick={() => setIsImageModalOpen(true)}
                        />
                        {productImages.length > 1 && (
                            <div className="relative z-10 flex items-center justify-between gap-3 mt-6 w-full">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        const container = document.getElementById('thumbnail-scroll-container');
                                        if (container) container.scrollBy({ left: -200, behavior: 'smooth' });
                                    }}
                                    className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm hover:shadow hidden sm:flex ${
                                        isDark ? 'bg-[#1a1c20] border-[#2a2e36] hover:bg-[#252830] hover:text-blue-400 text-slate-400' : 'bg-white border-slate-200 hover:bg-slate-50 hover:text-blue-600 text-slate-500'
                                    }`}
                                >
                                    <i className="fa-solid fa-chevron-left text-sm"></i>
                                </button>

                                <div id="thumbnail-scroll-container" className="flex gap-3 overflow-hidden pb-2 snap-x w-full scroll-smooth px-1 flex-1">
                                    {productImages.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedImageIndex(idx)}
                                            className={`snap-center shrink-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl bg-white border-2 overflow-hidden transition-all ${
                                                selectedImageIndex === idx
                                                    ? 'border-blue-500 ring-4 ring-blue-500/10 shadow-md scale-105'
                                                    : (isDark ? 'border-[#2a2e36]' : 'border-slate-100 opacity-60 hover:opacity-100 hover:border-slate-300')
                                            }`}
                                        >
                                            <img src={img} alt={`Thumbnail ${idx + 1}`} className={`w-full h-full object-contain p-2 ${isDark ? '' : 'mix-blend-multiply'}`} />
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        const container = document.getElementById('thumbnail-scroll-container');
                                        if (container) container.scrollBy({ left: 200, behavior: 'smooth' });
                                    }}
                                    className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm hover:shadow hidden sm:flex ${
                                        isDark ? 'bg-[#1a1c20] border-[#2a2e36] hover:bg-[#252830] hover:text-blue-400 text-slate-400' : 'bg-white border-slate-200 hover:bg-slate-50 hover:text-blue-600 text-slate-500'
                                    }`}
                                >
                                    <i className="fa-solid fa-chevron-right text-sm"></i>
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-6">
                        <div>
                            <div>
                                <div>
                                    <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full mb-3 ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-brand-blue'}`}>{seriesSubtitle}</span>
                                    <h1 className={`text-4xl lg:text-5xl font-bold leading-tight font-display mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.idu}</h1>
                                </div>

                                <div className={`flex items-center gap-2 text-sm p-2 rounded-xl border max-w-sm mt-2 ${isDark ? 'bg-[#111318] border-[#2b3038]' : 'bg-slate-50 border-slate-100'}`}>
                                    <span className={`font-medium pl-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Model Selector:</span>
                                    <CustomSelect
                                        value={selectedModel}
                                        onChange={val => setSelectedModel(Number(val))}
                                        options={models.map((m, idx) => ({ value: idx, label: m.title }))}
                                        isDark={isDark}
                                        className={`flex-1 ${isDark ? 'bg-[#1a1c20] text-white border-[#2b3038]' : 'bg-white'}`}
                                    />
                                </div>
                            </div>
                            <p className={`text-lg mt-2 leading-relaxed font-body ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Engineered for silence and efficiency. The series combines precision with tropical climate endurance, delivering rapid cooling even at high temperatures.
                            </p>
                        </div>

                        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0 p-4 md:p-6 rounded-2xl border mx-auto w-full transition-colors duration-300 ${isDark ? 'bg-[#1a1c20] border-[#2a2e36] text-slate-300' : 'bg-white border-slate-100 shadow-sm'}`}>
                            <div className="flex flex-col gap-1 p-2 md:p-0">
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Capacity</span>
                                <div className="flex items-end gap-1">
                                    <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{rawCapacity}</span>
                                    <span className="text-sm font-medium text-slate-500 mb-1">Tr</span>
                                </div>
                            </div>

                            <div className={`flex flex-col gap-1 md:border-l md:pl-4 p-2 md:p-0 ${isDark ? 'border-[#2a2e36]' : 'border-slate-100'}`}>
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Rating</span>
                                <div className="flex items-center">
                                    {currentModel.rating >= 2 ? (
                                        <img src={`/${currentModel.rating}-star.png`} alt={`${currentModel.rating} Star Rating`} className="h-6 object-contain" />
                                    ) : (
                                        <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.rating > 0 ? `${currentModel.rating}-Star` : 'N/A'}</span>
                                    )}
                                </div>
                            </div>

                            <div className={`flex flex-col gap-1 md:border-l md:pl-4 p-2 md:p-0 ${isDark ? 'border-[#2a2e36]' : 'border-slate-100'}`}>
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Refrigerant</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className={`text-xl font-bold uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.refrigerant}</span>
                                </div>
                            </div>

                            <div className={`flex flex-col gap-1 md:border-l md:pl-4 p-2 md:p-0 ${isDark ? 'border-[#2a2e36]' : 'border-slate-100'}`}>
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Price (MRP)</span>
                                <div className={`text-2xl font-bold max-w-full overflow-hidden text-ellipsis whitespace-nowrap ${isDark ? 'text-blue-400' : 'text-brand-blue'}`} title={currentModel.mrp}>{currentModel.mrp}</div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setShowPhonePopup(true)} className={`flex-1 font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 ${isDark ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/10' : 'bg-slate-900 hover:opacity-90 text-white'}`}>
                                <span className="material-icons-outlined text-[20px]">phone</span>
                                Enquire Now
                            </button>
                        </div>
                    </div>
                </div>

                <div className={`pt-12 border-t ${isDark ? 'border-[#2a2e36]' : 'border-slate-200'}`}>
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                        <div>
                            <h2 className={`text-3xl font-bold font-display ${isDark ? 'text-white' : 'text-slate-900'}`}>Technical Specifications</h2>
                            <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1`}>Detailed engineering data for professional installation.</p>
                        </div>
                    </div>

                    {isPLA || isSEZ ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="space-y-6">
                                <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                    <div className="bg-brand-blue px-6 py-4">
                                        <h3 className="text-white font-bold uppercase tracking-wider text-sm font-body">Unit Identification</h3>
                                    </div>
                                    <div className={`divide-y ${isDark ? 'divide-[#2a2e36]' : 'divide-slate-100'}`}>
                                        <div className="p-4 px-6">
                                            <label className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Indoor Unit</label>
                                            <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.idu}</div>
                                        </div>
                                        <div className="p-4 px-6">
                                            <label className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Outdoor Unit</label>
                                            <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.odu}</div>
                                        </div>
                                        {currentModel.panel && (
                                            <div className="p-4 px-6">
                                                <label className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Panel</label>
                                                <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.panel}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                    <div className="bg-slate-800 px-6 py-4">
                                        <h3 className="text-white font-bold uppercase tracking-wider text-sm">Performance Parameters</h3>
                                    </div>
                                    <table className="w-full text-left border-collapse">
                                        <tbody>
                                            <tr className={isDark ? 'bg-[#111318]' : 'bg-slate-50'}>
                                                <td colSpan={2} className="p-4 px-6 text-xs font-bold text-blue-600 uppercase tracking-tighter">Cooling</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'border-[#2a2e36]' : 'border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Capacity (Min-Max)</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.coolingCapacity}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Input</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.coolingPower}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'bg-slate-50 border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>EER</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.eer}</td>
                                            </tr>
                                            {currentModel.iseer !== '-' && (
                                                <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                    <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ISEER</td>
                                                    <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.iseer}</td>
                                                </tr>
                                            )}
                                            <tr className={isDark ? 'bg-[#111318]' : 'bg-slate-50'}>
                                                <td colSpan={2} className="p-4 px-6 text-xs font-bold text-blue-600 uppercase tracking-tighter">Heating</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'border-[#2a2e36]' : 'border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Capacity (Min-Max)</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.heatingCapacity}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Input</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.heatingPower}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'bg-slate-50 border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>COP</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.cop}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className={`lg:col-span-1 border rounded-2xl overflow-hidden self-start ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'border-slate-100'}`}>
                                <div className={`shadow-sm ${isDark ? 'bg-[#1a1c20]' : 'bg-white'}`}>
                                    <div className="bg-brand-blue px-6 py-4">
                                        <h3 className="text-white font-bold uppercase tracking-wider text-sm font-body">Indoor Unit</h3>
                                    </div>
                                    <table className="w-full text-left border-collapse">
                                        <tbody>
                                            <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Power Supply</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.powerSupply}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'bg-slate-50 border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>External finish</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.iduFinish}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Airflow (low-med2-med1-high)</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.iduAirflow}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'bg-slate-50 border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>External static pressure</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.externalStaticPressuse}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Operation control and thermostat</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.operationControl}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'bg-slate-50 border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Noise level (low-med2-med1-high)</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.iduNoise}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Unit drain pipe (outer dia.)</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.unitDrainPipe}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'bg-slate-50 border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Dimension {isPLA ? "Panel" : ""} (W x D x H)</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.iduDimPanel}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Weight {isPLA ? "(Panel)" : ""}</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.iduWeightPanel}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className={`lg:col-span-1 border rounded-2xl overflow-hidden self-start ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'border-slate-100'}`}>
                                <div className={`shadow-sm ${isDark ? 'bg-[#1a1c20]' : 'bg-white'}`}>
                                    <div className="bg-slate-800 px-6 py-4">
                                        <h3 className="text-white font-bold uppercase tracking-wider text-sm font-body">Outdoor Unit</h3>
                                    </div>
                                    <table className="w-full text-left border-collapse">
                                        <tbody>
                                            <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Power Supply</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.powerSupply}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'bg-slate-50 border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>External finish</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.oduFinish}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Refrigerant (R410A) control</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.refrigerantControl}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'bg-slate-50 border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Airflow</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.oduAirflow}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Noise Level</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.oduNoise}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'bg-slate-50 border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Dimensions (W x D x H)</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.oduDim}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Weight</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.oduWeight}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'bg-slate-50 border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Max. height difference</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.maxHeight}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Max. piping length</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.maxLength}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'bg-slate-50 border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Pipe size (outer diameter)</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.pipeSize}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="space-y-6">
                                <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                    <div className="bg-brand-blue px-6 py-4">
                                        <h3 className="text-white font-bold uppercase tracking-wider text-sm font-body">Unit Identification</h3>
                                    </div>
                                    <div className={`divide-y ${isDark ? 'divide-[#2a2e36]' : 'divide-slate-100'}`}>
                                        <div className="p-4 px-6">
                                            <label className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Indoor Unit</label>
                                            <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.idu}</div>
                                        </div>
                                        <div className="p-4 px-6">
                                            <label className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Outdoor Unit</label>
                                            <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.odu}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={`lg:col-span-1 border rounded-2xl overflow-hidden self-start ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'border-slate-100'}`}>
                                <div className={`shadow-sm ${isDark ? 'bg-[#1a1c20]' : 'bg-white'}`}>
                                    <div className="bg-slate-800 px-6 py-4">
                                        <h3 className="text-white font-bold uppercase tracking-wider text-sm">Performance Parameters</h3>
                                    </div>
                                    <table className="w-full text-left border-collapse">
                                        <tbody>
                                            <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'border-slate-100 bg-slate-50'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Capacity (Tr)</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.capacity}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>BEE Star Rating</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.rating} Star</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'border-slate-100 bg-slate-50'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Power Supply</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.powerSupply}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isHP ? 'Cooling Capacity (Rated Min-Max)' : 'Rated Capacity'}</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.ratedCapacity}</td>
                                            </tr>
                                            {isHP && (
                                                <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'border-slate-100 bg-slate-50'}`}>
                                                    <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Heating Capacity (Min-Max)</td>
                                                    <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.heatingCapacity}</td>
                                                </tr>
                                            )}
                                            <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'bg-slate-50 border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isHP ? 'Total Input (Cooling)' : 'Rated Power Input'}</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.ratedPower}</td>
                                            </tr>
                                            {isHP && (
                                                <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                    <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Input (Heating)</td>
                                                    <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.heatingPower}</td>
                                                </tr>
                                            )}
                                            <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isGK ? 'EER' : 'ISEER'}</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.iseer}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'bg-slate-50 border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isHP ? 'Current (Cooling)' : 'Rated Current'}</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.current} {isHP ? '' : 'Amps'}</td>
                                            </tr>
                                            {isHP && (
                                                <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                    <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Current (Heating)</td>
                                                    <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.heatingCurrent}</td>
                                                </tr>
                                            )}
                                            <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Indoor Air Flow (m3/h)</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.airFlow}</td>
                                            </tr>
                                            {isHP && (
                                                <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'border-slate-100 bg-slate-50'}`}>
                                                    <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Air Flow (Heating)</td>
                                                    <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.heatingAirFlow}</td>
                                                </tr>
                                            )}
                                            <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'bg-slate-50 border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Indoor Noise (dB(A))</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.noise}</td>
                                            </tr>
                                            {isHP && (
                                                <tr className={`border-b ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'bg-white border-slate-100'}`}>
                                                    <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Noise (Heating)</td>
                                                    <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.heatingNoise}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className={`lg:col-span-1 border rounded-2xl overflow-hidden self-start ${isDark ? 'bg-[#1a1c20] border-[#2a2e36]' : 'border-slate-100'}`}>
                                <div className={`shadow-sm ${isDark ? 'bg-[#1a1c20]' : 'bg-white'}`}>
                                    <div className="bg-slate-800 px-6 py-4">
                                        <h3 className="text-white font-bold uppercase tracking-wider text-sm">Dimensions & Weight</h3>
                                    </div>
                                    <table className="w-full text-left border-collapse">
                                        <tbody>
                                            <tr className={isDark ? 'bg-[#111318]' : 'bg-slate-50'}>
                                                <td colSpan={2} className="p-4 px-6 text-xs font-bold text-blue-600 uppercase tracking-tighter">Indoor Unit (IDU)</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'border-[#2a2e36]' : 'border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Net Dim (WxDxH) mm</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.iduDim}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'bg-slate-50 border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Net Weight</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.iduWeight} kg</td>
                                            </tr>

                                            <tr className={isDark ? 'bg-[#111318]' : 'bg-slate-50'}>
                                                <td colSpan={2} className="p-4 px-6 text-xs font-bold text-blue-600 uppercase tracking-tighter">Outdoor Unit (ODU)</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'border-[#2a2e36]' : 'border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Net Dim (WxDxH) mm</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.oduDim}</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'bg-slate-50 border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Net Weight</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.oduWeight} kg</td>
                                            </tr>

                                            <tr className={isDark ? 'bg-[#111318]' : 'bg-slate-50'}>
                                                <td colSpan={2} className="p-4 px-6 text-xs font-bold text-blue-600 uppercase tracking-tighter">Installation Details</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'border-[#2a2e36]' : 'border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Ambient Op Range</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>Up to 48°C / 52°C</td>
                                            </tr>
                                            <tr className={`border-b ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'bg-slate-50 border-slate-100'}`}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Piping Dia (Gas/Liq)</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.pipeDia}</td>
                                            </tr>
                                            <tr className={isDark ? 'bg-[#111318]' : 'bg-slate-50'}>
                                                <td className={`p-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Max Length/Elevation</td>
                                                <td className={`p-4 px-6 text-sm font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentModel.maxLength}m / {currentModel.maxElev}m</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <footer className={`mt-20 border-t py-12 transition-colors duration-300 ${isDark ? 'bg-[#111318] border-[#2a2e36]' : 'bg-white border-slate-200'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-2 grayscale opacity-60">
                            <div className={`w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-sm ${isDark ? 'bg-slate-700' : 'bg-slate-400'}`}>SE</div>
                            <span className={`font-normal text-xs tracking-tight uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`} style={{ fontFamily: "'Open Sans', sans-serif" }}>{APP_NAME}</span>
                        </div>
                        <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                            © {new Date().getFullYear()} {APP_NAME}. All rights reserved. Precision cooling solutions.
                        </p>
                        <div className="flex gap-6">
                            <a href="#" className={`transition-colors text-sm ${isDark ? 'text-slate-500 hover:text-blue-400' : 'text-slate-400 hover:text-blue-600'}`}>Privacy Policy</a>
                            <a href="#" className={`transition-colors text-sm ${isDark ? 'text-slate-500 hover:text-blue-400' : 'text-slate-400 hover:text-blue-600'}`}>Support</a>
                            <a href="#" className={`transition-colors text-sm ${isDark ? 'text-slate-500 hover:text-blue-400' : 'text-slate-400 hover:text-blue-600'}`}>Contact</a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Phone Enquiry Modal */}
            {showPhonePopup && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowPhonePopup(false)}>
                    <div className={`rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#1a1c20] border border-[#2a2e36]' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ${isDark ? 'bg-blue-950/40 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                            <span className="material-icons-outlined text-4xl">phone_in_talk</span>
                        </div>
                        <h3 className={`text-2xl font-display font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Sales & Enquiry</h3>
                        <p className={`mb-8 text-sm px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Our experts are ready to help you find the perfect cooling solution.</p>

                        <a href={`tel:${companyPhone.replace(/\D/g, '')}`} className={`block w-full border rounded-2xl p-4 transition-all mb-4 group cursor-pointer shadow-sm hover:shadow-md ${isDark ? 'bg-[#111318] border-[#2b3038] hover:border-blue-500/30 hover:bg-[#1d2026]' : 'bg-slate-50 border-slate-200 hover:border-blue-500/50 hover:bg-blue-50/50'}`}>
                            <div className={`text-3xl font-bold tracking-wider transition-colors flex items-center justify-center gap-2 ${isDark ? 'text-white group-hover:text-blue-400' : 'text-slate-800 group-hover:text-blue-600'}`}>
                                <span className={`material-icons-outlined ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>phone</span>
                                {companyPhone}
                            </div>
                            <div className={`text-xs font-bold mt-2 uppercase tracking-widest flex items-center justify-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                <span className="material-icons-outlined text-[14px]">touch_app</span>
                                Tap to Call
                            </div>
                        </a>

                        <a href="https://maps.google.com/?q=Mitsubishi+Electric+-+Satguru+Engineers,+SCF-29+PH-2,+Sahibzada+Ajit+Singh+Nagar,+Punjab+160055" target="_blank" rel="noopener noreferrer" className={`block w-full border rounded-2xl p-4 transition-all mb-6 group cursor-pointer shadow-sm hover:shadow-md ${isDark ? 'bg-[#111318] border-[#2b3038] hover:border-blue-500/30 hover:bg-[#1d2026]' : 'bg-slate-50 border-slate-200 hover:border-blue-500/50 hover:bg-blue-50/50'}`}>
                            <div className={`text-sm font-bold tracking-tight transition-colors flex items-start text-left gap-3 ${isDark ? 'text-white group-hover:text-blue-400' : 'text-slate-800 group-hover:text-blue-600'}`}>
                                <span className={`material-icons-outlined shrink-0 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`}>place</span>
                                <span>Mitsubishi Electric - Satguru Engineers, SCF-29 PH-2, Sahibzada Ajit Singh Nagar, Punjab 160055</span>
                            </div>
                            <div className={`text-xs font-bold mt-3 uppercase tracking-widest flex items-center justify-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                <span className="material-icons-outlined text-[14px]">directions</span>
                                Open in Maps
                            </div>
                        </a>

                        <button
                            onClick={() => setShowPhonePopup(false)}
                            className={`w-full py-4 text-sm font-bold transition-colors rounded-xl ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Full Screen Image Modal */}
            {isImageModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsImageModalOpen(false)}>
                    <button
                        onClick={() => setIsImageModalOpen(false)}
                        className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-12 h-12 flex items-center justify-center transition-all z-[120]"
                    >
                        <i className="fa-solid fa-xmark text-2xl"></i>
                    </button>

                    <div className="relative flex items-center justify-center w-full max-w-5xl h-full pointer-events-none">
                        {productImages.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImageIndex((prev) => (prev === 0 ? productImages.length - 1 : prev - 1));
                                }}
                                className="absolute left-4 md:left-12 z-[120] text-white/50 hover:text-white bg-black/50 hover:bg-black/80 rounded-full w-12 h-12 md:w-16 md:h-16 flex items-center justify-center transition-all pointer-events-auto backdrop-blur-sm"
                            >
                                <i className="fa-solid fa-chevron-left text-2xl md:text-3xl"></i>
                            </button>
                        )}

                        <img
                            alt={`Enlarged view - ${currentModel.idu}`}
                            className="max-w-full max-h-[90vh] object-contain drop-shadow-2xl animate-in zoom-in-95 duration-300 bg-white rounded-2xl p-4 sm:p-8 pointer-events-auto"
                            src={productImages[selectedImageIndex] || productImages[0]}
                            onClick={e => e.stopPropagation()}
                        />

                        {productImages.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImageIndex((prev) => (prev === productImages.length - 1 ? 0 : prev + 1));
                                }}
                                className="absolute right-4 md:right-12 z-[120] text-white/50 hover:text-white bg-black/50 hover:bg-black/80 rounded-full w-12 h-12 md:w-16 md:h-16 flex items-center justify-center transition-all pointer-events-auto backdrop-blur-sm"
                            >
                                <i className="fa-solid fa-chevron-right text-2xl md:text-3xl"></i>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductDetail;
