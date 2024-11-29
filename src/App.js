import React, { useState, useEffect, useRef, useCallback } from "react";
import moment from "moment";
import 'moment/locale/fr';  // Import de la locale française
import { Chart } from 'chart.js/auto'; // Import de Chart.js

// Configurer Moment.js pour utiliser le français
moment.locale('fr');

const App = () => {
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
    const [transactions, setTransactions] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState('all'); 
    const [selectedYear, setSelectedYear] = useState('all'); 
    const [formData, setFormData] = useState({
        //format date en francais
        date: moment().format("YYYY-MM-DD"), // Date du jour par défaut
        montant: "",
        description: "",
        recurrence: "none", // Par défaut
        recurrenceStep: "1",
        recurrenceEndDate: moment().add(1, "year").format("YYYY-MM-DD"),
    });
    const [totalBalance, setTotalBalance] = useState(0);
    const [futureBalance, setFutureBalance] = useState(0);
    const [error, setError] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [fileName, setFileName] = useState("");
    const [showExportModal, setShowExportModal] = useState(false);
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const [hoveredTransactionId, setHoveredTransactionId] = useState(null);

    // Charger les transactions depuis le localStorage lors du montage du composant
    useEffect(() => {
        const savedTransactions = JSON.parse(
            localStorage.getItem("transactions")
        );
        if (savedTransactions) {
            setTransactions(savedTransactions);
            updateCumulativeBalances(savedTransactions);
        }
    }, []);

    // Sauvegarder les transactions dans le localStorage à chaque mise à jour
    useEffect(() => {
        localStorage.setItem("transactions", JSON.stringify(transactions));
    }, [transactions]);

    // Gérer le dark mode
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);

    // Gestion des changements dans le formulaire
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevFormData) => ({
            ...prevFormData,
            [name]: value,
            ...(name === "date" && {
                recurrenceEndDate: moment(value)
                    .add(1, "year")
                    .format("YYYY-MM-DD"),
            }),
        }));
    };

    // Générer les transactions récurrentes
    const generateRecurrentTransactions = (transaction) => {
        const recurrentTransactions = [];
        let step = 1;
        const startDate = moment(transaction.date);
        let currentDate = moment(transaction.date);
        const endDate = moment(transaction.recurrenceEndDate);

        while (currentDate.isBefore(endDate) || currentDate.isSame(endDate)) {
            const newTransaction = {
                ...transaction,
                id: Date.now() + Math.random(), // Générer un ID unique
                date: currentDate.format("YYYY-MM-DD"),
            };
            recurrentTransactions.push(newTransaction);

            // Gérer les récurrences
            if (transaction.recurrence === "day") {
                currentDate = moment(startDate).add(transaction.recurrenceStep*step, "days");
            } else if (transaction.recurrence === "month") {
                currentDate = moment(startDate).add(transaction.recurrenceStep*step, "months");
                console.log(startDate)
                console.log(step)
                console.log(currentDate)

                // Ajuster les dates pour les mois ayant moins de jours
                if (currentDate.date() > currentDate.daysInMonth()) {
                    currentDate.date(currentDate.daysInMonth());
                }
                console.log(currentDate)
            } else if (transaction.recurrence === "year") {
                currentDate = moment(startDate).add(transaction.recurrenceStep*step, "years");

                // Ajuster pour les années bissextiles (février 29)
                if (currentDate.date() > currentDate.daysInMonth()) {
                    currentDate.date(currentDate.daysInMonth());
                }
                console.log(currentDate)
            }
            step++;
        }

        return recurrentTransactions;
    };

    // Ajouter une transaction
    const addTransaction = (e) => {
        e.preventDefault();

        const newTransaction = {
            id: Date.now(),
            date: formData.date,
            montant: formData.montant,
            description: formData.description,
            recurrence: formData.recurrence,
            recurrenceStep: formData.recurrenceStep,
            recurrenceEndDate: formData.recurrenceEndDate,
        };

        // Ajoutez uniquement la transaction d'origine, sans doublon
        let updatedTransactions = [newTransaction];

        if (formData.recurrence !== "none") {
            // Générer les transactions récurrentes
            const recurrentTransactions =
                generateRecurrentTransactions(newTransaction);
            // Ajoutez uniquement les transactions récurrentes, sans ajouter la transaction initiale
            updatedTransactions = [...recurrentTransactions];
        }

        // Ajoutez la nouvelle transaction et les récurrentes sans doublon
        setTransactions([...updatedTransactions, ...transactions]);

        // Réinitialiser le formulaire après l'ajout
        setFormData({
            date: moment().format("YYYY-MM-DD"),
            montant: "",
            description: "",
            recurrence: "none",
            recurrenceStep: "1",
            recurrenceEndDate: moment().add(1, "year").format("YYYY-MM-DD"),
        });

        // Mettre à jour les soldes cumulatifs
        updateCumulativeBalances([...updatedTransactions, ...transactions]);
    };

    // Ajouter un état pour gérer la transaction à modifier
    const [editTransaction, setEditTransaction] = useState(null);

    // Fonction pour démarrer la modification
    const startEditing = (transaction) => {
        setEditTransaction(transaction);
        setFormData({
            date: transaction.date,
            montant: transaction.montant,
            description: transaction.description,
            recurrence: "none",
            recurrenceStep: transaction.recurrenceStep,
            recurrenceEndDate: transaction.recurrenceEndDate,
        });

        //scroll smooth to form
        window.scrollTo({
            top: document.querySelector(".form-transaction").offsetTop - 44,
            behavior: "smooth",
        });

        //quand le scroll est fini :

        document
            .querySelector('input[name="montant"]')
            .focus({ preventScroll: true });

        console.log("Scrolling to top...");
    };

    // Sauvegarder les modifications
    const saveChanges = (e) => {
        e.preventDefault();
        
        // Supprimer l'ancienne transaction
        const updatedTransactions = transactions.filter(t => t.id !== editTransaction.id);

        // Créer la nouvelle transaction avec les modifications
        const newTransaction = {
            id: Date.now(),
            date: formData.date,
            montant: formData.montant,
            description: formData.description,
            recurrence: formData.recurrence,
            recurrenceStep: formData.recurrenceStep,
            recurrenceEndDate: formData.recurrenceEndDate,
        };

        let finalTransactions = [...updatedTransactions];

        if (formData.recurrence !== "none") {
            // Générer les transactions récurrentes
            const recurrentTransactions = generateRecurrentTransactions(newTransaction);
            finalTransactions = [...finalTransactions, ...recurrentTransactions];
        } else {
            // Si pas de récurrence, ajouter simplement la transaction modifiée
            finalTransactions.push(newTransaction);
        }

        setTransactions(finalTransactions);
        setEditTransaction(null); // Réinitialiser le mode d'édition
        setFormData({
            date: moment().format("YYYY-MM-DD"),
            montant: "",
            description: "",
            recurrence: "none",
            recurrenceStep: "1",
            recurrenceEndDate: moment().add(1, "year").format("YYYY-MM-DD"),
        });
        updateCumulativeBalances(finalTransactions);
    };

    // Supprimer une transaction
    const deleteTransaction = (id) => {
        const updatedTransactions = transactions.filter((t) => t.id !== id);
        setTransactions(updatedTransactions);
        updateCumulativeBalances(updatedTransactions);
    };

    // Supprimer toutes les transactions
    const deleteAllTransactions = () => {
        setTransactions([]);
        setTotalBalance(0);
        setFutureBalance(0);
        setShowModal(false);
    };

    // Fonction pour supprimer les transactions filtrées
    const deleteFilteredTransactions = () => {
        const filteredIds = filterTransactionsByMonth(transactions).map(t => t.id);
        setTransactions(prevTransactions => {
            const newTransactions = prevTransactions.filter(t => !filteredIds.includes(t.id));
            // Mise à jour des soldes
            updateCumulativeBalances(newTransactions);
            return newTransactions;
        });
        // Réinitialisation des filtres
        setSelectedMonth('all');
        setSelectedYear('all');
    };

    // Fonction pour supprimer les transactions non filtrées
    const deleteNonFilteredTransactions = () => {
        const filteredIds = filterTransactionsByMonth(transactions).map(t => t.id);
        setTransactions(prevTransactions => {
            const newTransactions = prevTransactions.filter(t => filteredIds.includes(t.id));
            // Mise à jour des soldes
            updateCumulativeBalances(newTransactions);
            return newTransactions;
        });
        // Réinitialisation des filtres
        setSelectedMonth('all');
        setSelectedYear('all');
    };

    // Mettre à jour les soldes cumulatifs
    const updateCumulativeBalances = (transactions) => {
        let total = 0;
        let future = 0;
        const today = moment().format("YYYY-MM-DD");

        // Trier toutes les transactions par date et ID
        const sortedTransactions = [...transactions].sort((a, b) => {
            const dateComparison = moment(a.date).diff(moment(b.date));
            if (dateComparison === 0) {
                // Si même date, utiliser l'ID (qui reflète l'ordre d'insertion)
                return a.id - b.id;
            }
            return dateComparison;
        });

        // Calculer les soldes cumulatifs
        const updatedTransactions = sortedTransactions.map((transaction) => {
            const amount = parseFloat(transaction.montant);
            total += amount;
            
            if (moment(transaction.date).isAfter(today)) {
                future += amount;
            }

            return {
                ...transaction,
                solde: total,
            };
        });

        // Créer un Map pour un accès rapide aux soldes par ID
        const soldeMap = new Map(updatedTransactions.map(t => [t.id, t.solde]));

        // Mettre à jour les transactions en conservant leur ordre d'origine
        const finalTransactions = transactions.map(t => ({
            ...t,
            solde: soldeMap.get(t.id)
        }));

        setTransactions(finalTransactions);
        setTotalBalance(total);
        setFutureBalance(future);
    };

    // Fonction pour calculer le solde cumulé jusqu'à un mois donné
    const calculateCumulativeBalance = (currentMonth) => {
        return transactions
            .filter(t => moment(t.date).isSameOrBefore(moment(currentMonth, 'MMMM YYYY').endOf('month')))
            .reduce((acc, t) => acc + parseFloat(t.montant), 0);
    };

    // Fonction pour calculer le solde à une date donnée
    const calculateBalanceAtDate = useCallback((date) => {
        return transactions
            .filter(t => moment(t.date).isSameOrBefore(date))
            .reduce((acc, t) => acc + parseFloat(t.montant), 0);
    }, [transactions]);

    // Exporter les transactions en JSON
    const exportToJson = () => {
        setShowExportModal(true);
    };

    // Confirmer l'exportation
    const confirmExport = () => {
        const dataStr = JSON.stringify(transactions, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setShowExportModal(false);
        setFileName("");
    };

    // Importer les transactions depuis un fichier JSON
    const importFromJson = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const jsonData = JSON.parse(event.target.result);
                    if (validateTransactions(jsonData)) {
                        setTransactions(jsonData);
                        updateCumulativeBalances(jsonData);
                        setError("");
                    } else {
                        setError(
                            "Le fichier JSON importé a une structure invalide."
                        );
                    }
                } catch (error) {
                    setError("Erreur lors de la lecture du fichier JSON.");
                }
            };
            reader.readAsText(file);
        }
    };

    // Valider la structure des transactions
    const validateTransactions = (transactions) => {
        return transactions.every(transaction =>
            // Vérifier que tous les champs requis existent
            transaction.hasOwnProperty('id') &&
            transaction.hasOwnProperty('date') &&
            transaction.hasOwnProperty('montant') &&
            transaction.hasOwnProperty('description') &&
            transaction.hasOwnProperty('recurrence') &&
            transaction.hasOwnProperty('recurrenceStep') &&
            transaction.hasOwnProperty('recurrenceEndDate') &&
            // Vérifier les types et les valeurs
            Number.isFinite(parseFloat(transaction.montant)) && // Le montant doit être un nombre
            moment(transaction.date, 'YYYY-MM-DD', true).isValid() && // La date doit être valide
            typeof transaction.description === 'string' && // La description doit être une chaîne
            ['none', 'day', 'month', 'year'].includes(transaction.recurrence) && // La récurrence doit être une valeur valide
            (transaction.recurrence === 'none' || Number.isFinite(parseFloat(transaction.recurrenceStep))) && // Le pas de récurrence doit être un nombre si la récurrence est activée
            (transaction.recurrence === 'none' || moment(transaction.recurrenceEndDate, 'YYYY-MM-DD', true).isValid()) // La date de fin de récurrence doit être valide si la récurrence est activée
        );
    };

    let balanceTotal = totalBalance; // Solde initial global
    const sortedTransactions = transactions.sort((a, b) =>
        moment(a.date).isAfter(b.date) ? -1 : 1
    );

    // Fonction pour regrouper les transactions par mois
    const groupTransactionsByMonth = useCallback((filteredTransactions) => {
        const groups = filteredTransactions.reduce((groups, transaction) => {
            const month = moment(transaction.date).format('YYYY-MM');
            
            if (!groups[month]) {
                groups[month] = {
                    month,
                    transactions: [],
                    monthlyBalance: 0,
                    initBalance: 0
                };
            }
            groups[month].transactions.push(transaction);
            groups[month].monthlyBalance += parseFloat(transaction.montant);
            
            // Calculer le solde initial pour ce mois
            const transactionDate = moment(transaction.date);
            groups[month].initBalance = calculateBalanceAtDate(transactionDate.endOf('month'));
            
            return groups;
        }, {});

        // Trier les transactions de chaque mois pour l'affichage (ordre inverse)
        Object.values(groups).forEach(group => {
            group.transactions.sort((a, b) => {
                const dateA = moment(a.date);
                const dateB = moment(b.date);
                if (dateA.isSame(dateB, 'day')) {
                    // Pour le même jour, inverser l'ordre des ID
                    return b.id - a.id;
                }
                // Du plus récent au plus ancien
                return dateB.diff(dateA);
            });
        });

        return groups;
    }, [calculateBalanceAtDate]);

    // Fonction pour obtenir la liste unique des mois disponibles en fonction de l'année sélectionnée
    const getAvailableMonths = () => {
        const months = new Set();
        transactions.forEach(transaction => {
            const month = moment(transaction.date).format('MM');
            months.add(month);
        });
        return Array.from(months).sort((a, b) => parseInt(a) - parseInt(b));
    };

    // Fonction pour obtenir la liste unique des années disponibles en fonction du mois sélectionné
    const getAvailableYears = () => {
        const years = new Set();
        transactions.forEach(transaction => {
            const transactionDate = moment(transaction.date);
            // Si un mois est sélectionné, ne prendre que les années où ce mois a des transactions
            if (selectedMonth === 'all' || transactionDate.format('MM') === selectedMonth) {
                const year = transactionDate.format('YYYY');
                years.add(year);
            }
        });
        return Array.from(years).sort((a, b) => b - a); // Tri décroissant
    };

    // Fonction pour filtrer les transactions par mois et année
    const filterTransactionsByMonth = (transactions) => {
        if (selectedMonth === 'all' && selectedYear === 'all') {
            // Si aucun filtre, appliquer uniquement le tri
            return transactions.sort((a, b) => {
                const dateComparison = moment(a.date).diff(moment(b.date));
                if (dateComparison === 0) {
                    return a.id - b.id;
                }
                return dateComparison;
            });
        }

        // Filtrer les transactions pour le mois/année sélectionnés
        const filteredTransactions = transactions.filter(transaction => {
            const transactionDate = moment(transaction.date);
            const monthMatch = selectedMonth === 'all' || transactionDate.format('MM') === selectedMonth;
            const yearMatch = selectedYear === 'all' || transactionDate.format('YYYY') === selectedYear;
            return monthMatch && yearMatch;
        });

        // Appliquer le tri cohérent
        return filteredTransactions.sort((a, b) => {
            const dateComparison = moment(a.date).diff(moment(b.date));
            if (dateComparison === 0) {
                // Si même date, utiliser l'ID (qui reflète l'ordre d'insertion)
                return a.id - b.id;
            }
            return dateComparison;
        });
    };

    // Préparation des données du graphique
    const prepareChartData = useCallback(() => {
        const filteredTransactions = filterTransactionsByMonth(transactions);
        
        // Trier d'abord par date, puis par ordre d'insertion pour les transactions du même jour
        const sortedTransactions = [...filteredTransactions].sort((a, b) => {
            const dateComparison = moment(a.date).diff(moment(b.date));
            if (dateComparison === 0) {
                // Si même date, utiliser l'ID (qui reflète l'ordre d'insertion)
                return a.id - b.id;
            }
            return dateComparison;
        });

        let balance = 0;
        const data = sortedTransactions.map(transaction => {
            balance += parseFloat(transaction.montant);
            return {
                date: transaction.date,
                balance: balance
            };
        });

        return {
            labels: data.map(item => moment(item.date).format('DD/MM/YYYY')),
            values: data.map(item => item.balance)
        };
    }, [filterTransactionsByMonth, transactions]);

    // Initialisation du graphique
    useEffect(() => {
        // Si pas de contexte de canvas ou pas de transactions, détruire le graphique existant et sortir
        if (!chartRef.current) return;

        const ctx = chartRef.current.getContext('2d');
        
        // Détruire l'instance précédente si elle existe
        if (chartInstance.current) {
            chartInstance.current.destroy();
            chartInstance.current = null;
        }

        // Si pas de transactions, ne pas créer de nouveau graphique
        if (!transactions.length) return;

        const chartData = prepareChartData();

        // Création initiale du graphique
        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Solde',
                    data: chartData.values,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: {
                    duration: 0 // désactive les animations
                },
                resizeDelay: 0,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [transactions, prepareChartData]);

    // Mise à jour des données du graphique uniquement lors des changements pertinents
    useEffect(() => {
        if (!chartInstance.current || !transactions.length) return;

        const chartData = prepareChartData();
        chartInstance.current.data.labels = chartData.labels;
        chartInstance.current.data.datasets[0].data = chartData.values;
        chartInstance.current.update('none');
    }, [transactions, selectedMonth, selectedYear]);

    // Fonction pour calculer les soldes en tenant compte des filtres
    const calculateFilteredBalances = useCallback(() => {
        const filteredTransactions = filterTransactionsByMonth(transactions);
        const today = new Date().toISOString().split('T')[0];
        let total = 0;
        let future = 0;

        filteredTransactions.forEach(transaction => {
            const amount = parseFloat(transaction.montant);
            total += amount;
            
            if (new Date(transaction.date) > new Date(today)) {
                future += amount;
            }
        });

        return { total, future };
    }, [filterTransactionsByMonth, transactions]);

    // Mettre à jour les soldes quand les filtres changent
    useEffect(() => {
        const { total, future } = calculateFilteredBalances();
        setTotalBalance(total);
        setFutureBalance(future);
    }, [selectedMonth, selectedYear, calculateFilteredBalances]);

    // État pour contrôler l'affichage du header sticky
    const [showStickyHeader, setShowStickyHeader] = useState(false);

    // Gérer le scroll pour afficher/masquer le header sticky
    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY;
            setShowStickyHeader(scrollPosition > 200); // Apparaît après 200px de scroll
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className={`min-h-screen p-4 md:p-8 transition-colors duration-200 ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-b from-gray-50 to-gray-100'}`}>
            {/* Bouton Dark Mode fixe (visible uniquement quand le sticky header est caché) */}
            <div className={`fixed top-4 right-4 z-50 transition-opacity duration-300 ${showStickyHeader ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                    aria-label="Toggle Dark Mode"
                >
                    {darkMode ? (
                        <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Header sticky */}
            <div className={`fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 z-50 ${showStickyHeader ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="container mx-auto px-4 py-2">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Vue d'ensemble</h2>
                        <div className="flex space-x-4 items-center">
                            <div className="text-sm">
                                <span className="font-medium dark:text-white">Solde actuel:</span>
                                <span className={`ml-2 ${totalBalance-futureBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {montantFormate(totalBalance-futureBalance)}
                                </span>
                            </div>
                            <div className="text-sm">
                                <span className="font-medium dark:text-white">Solde futur:</span>
                                <span className={`ml-2 ${totalBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {montantFormate(totalBalance)} 
                                </span>
                                <span className={`ml-2 text-xs ${futureBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    ({montantFormate(futureBalance)})
                                </span>
                            </div>
                            {/* Bouton Dark Mode dans le header */}
                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                                aria-label="Toggle Dark Mode"
                            >
                                {darkMode ? (
                                    <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 text-center">
                Gestionnaire de budget
            </h1>

            {/* Boutons d'exportation et d'importation */}
            <div className="mb-8 flex flex-wrap justify-center gap-4">
                <button
                    onClick={exportToJson}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 shadow-sm dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                    <span>Exporter en JSON</span>
                </button>
                <label className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors duration-200 cursor-pointer flex items-center gap-2 shadow-sm dark:bg-blue-600 dark:hover:bg-blue-700">
                    <span>Importer en JSON</span>
                    <input
                        type="file"
                        accept=".json"
                        onChange={importFromJson}
                        className="hidden"
                    />
                </label>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 shadow-sm dark:bg-red-600 dark:hover:bg-red-700"
                >
                    <span>Supprimer toutes les transactions</span>
                </button>
            </div>

            {/* Solde total et solde à venir */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg mb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-8 text-center">Vue d'ensemble</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-300 mb-2">Solde actuel</p>
                            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{montantFormate(totalBalance-futureBalance)}</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900 dark:to-emerald-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300 mb-2">Solde futur</p>
                            <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                                {montantFormate(totalBalance)} 
                                <span className={`text-lg ml-2 ${futureBalance >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                                    ({montantFormate(futureBalance)})
                                </span>
                            </p>
                        </div>                    
                    </div>
                </div>
            </div>
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Formulaire */}
            <form
                onSubmit={editTransaction ? saveChanges : addTransaction}
                className="form-transaction bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg w-full mx-auto"
            >
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
                    {editTransaction ? "Modifier la transaction" : "Nouvelle transaction"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors duration-200"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Montant</label>
                        <input
                            type="number"
                            name="montant"
                            value={formData.montant}
                            onChange={handleChange}
                            placeholder="Montant"
                            required
                            className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors duration-200"
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                        <input
                            type="text"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Description"
                            className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors duration-200"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Récurrence</label>
                        <select
                            name="recurrence"
                            value={formData.recurrence}
                            onChange={handleChange}
                            className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors duration-200"
                        >
                            <option value="none">Aucune</option>
                            <option value="day">Jour</option>
                            <option value="month">Mois</option>
                            <option value="year">Année</option>
                        </select>
                    </div>
                    {formData.recurrence !== "none" && (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
                                <input
                                    type="number"
                                    name="recurrenceStep"
                                    value={formData.recurrenceStep}
                                    onChange={handleChange}
                                    placeholder="Nombre"
                                    min="1"
                                    required
                                    className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors duration-200"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date de fin de récurrence</label>
                                <input
                                    type="date"
                                    name="recurrenceEndDate"
                                    value={formData.recurrenceEndDate}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors duration-200"
                                />
                            </div>
                        </>
                    )}
                </div>
                <button
                    type="submit"
                    className={`mx-auto mt-6 block ${
                        editTransaction ? "bg-yellow-500" : "bg-blue-500"
                    } text-white px-6 py-2 rounded-lg transition-colors duration-200 hover:${
                        editTransaction ? "bg-yellow-700" : "bg-blue-700"
                    } dark:bg-yellow-600 dark:hover:bg-yellow-700`}
                >
                    {editTransaction
                        ? "Modifier la transaction"
                        : "Ajouter la transaction"}
                </button>
            </form>
                            {/* Graphique ou message alternatif */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                {transactions.length > 0 ? (
                    <div className="flex justify-center items-center" style={{ height: '100%', width: '100%' }}>
                        <canvas ref={chartRef}></canvas>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-6 mb-4">
                            <svg className="w-16 h-16 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                            Aucune transaction à afficher
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Commencez à ajouter des transactions pour voir l'évolution de votre solde dans le temps.
                        </p>
                        <div className="animate-bounce">
                            <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>
            </div>
            {/* Afficher les erreurs */}
            {error && <div className="text-red-500 dark:text-red-400 mb-4">{error}</div>}
            {/* Ajout des sélecteurs de mois et d'année */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0 md:space-x-4">
                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                    <select
                        className="p-2 border rounded-lg capitalize dark:bg-gray-700 dark:text-white"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                        <option value="all">Tous les mois</option>
                        {getAvailableMonths().map((month) => (
                            <option key={month} value={month}>
                                {moment().month(parseInt(month) - 1).format("MMMM")}
                            </option>
                        ))}
                    </select>
                    <select
                        className="p-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        <option value="all">Toutes les années</option>
                        {getAvailableYears().map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex space-x-4">
                    <button
                        onClick={deleteFilteredTransactions}
                        className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 shadow-sm dark:bg-red-600 dark:hover:bg-red-700"
                    >
                        <span>Supprimer les transactions filtrées</span>
                    </button>
                    <button
                        onClick={deleteNonFilteredTransactions}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 shadow-sm dark:bg-orange-600 dark:hover:bg-orange-700"
                    >
                        <span>Supprimer les transactions non filtrées</span>
                    </button>
                </div>
            </div>
            {/* Liste des transactions */}
            <div className="space-y-6">
                {Object.entries(groupTransactionsByMonth(filterTransactionsByMonth(transactions)))
                    .sort((a, b) => moment(b[0], 'YYYY-MM').diff(moment(a[0], 'YYYY-MM')))
                    .map(([month, data]) => (
                    <div key={month} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white capitalize">
                                    {moment(month, 'YYYY-MM').format('MMMM YYYY')}
                                </h3>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Solde du mois:</span> {montantFormate(data.monthlyBalance)}
                                    <span className="mx-2">|</span>
                                    <span className="font-medium">Solde:</span> {montantFormate(data.initBalance)}
                                </div>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-200 dark:divide-gray-600">
                            {data.transactions.map((transaction, index) => (
                                <div key={transaction.id} 
                                     onMouseEnter={() => setHoveredTransactionId(transaction.id)}
                                     onMouseLeave={() => setHoveredTransactionId(null)}
                                     className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 relative">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex-shrink-0">
                                                <div className={`w-2 h-2 rounded-full ${
                                                    parseFloat(transaction.montant) >= 0 
                                                    ? 'bg-emerald-400' 
                                                    : 'bg-red-400'
                                                }`}></div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {transaction.description || "Sans description"}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {moment(transaction.date).format("DD MMMM YYYY")}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center space-x-4">
                                        {hoveredTransactionId === transaction.id && (
                                        <div className="bg-gray-800 dark:bg-gray-600 text-white dark:text-gray-200 px-3 py-1 rounded shadow-lg text-sm z-10">
                                            Solde: {montantFormate(transaction.solde)}
                                        </div>
                                    )}
                                            <span className={`text-sm font-medium px-2 py-1 rounded ${
                                                parseFloat(transaction.montant) >= 0 
                                                ? 'bg-emerald-400/30' 
                                                : 'bg-red-400/30'
                                            } ${
                                                parseFloat(transaction.montant) >= 0 
                                                ? 'text-emerald-600' 
                                                : 'text-red-600'
                                            }`}>
                                                {montantFormate(transaction.montant)}
                                            </span>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => startEditing(transaction)}
                                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors duration-150"
                                                >
                                                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => deleteTransaction(transaction.id)}
                                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors duration-150"
                                                >
                                                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modale de confirmation de suppression */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Confirmer la suppression
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Êtes-vous sûr de vouloir supprimer toutes les transactions ? Cette action est irréversible.
                        </p>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-500 transition-colors duration-150"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={deleteAllTransactions}
                                className="px-4 py-2 bg-red-500 dark:bg-red-600 text-white rounded-lg hover:bg-red-600 dark:hover:bg-red-700 transition-colors duration-150"
                            >
                                Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modale d'exportation */}
            {showExportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Exporter les transactions
                        </h3>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Nom du fichier
                            </label>
                            <input
                                type="text"
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                placeholder="transactions"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors duration-200"
                            />
                        </div>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setShowExportModal(false)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-500 transition-colors duration-150"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmExport}
                                className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors duration-150"
                            >
                                Exporter
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;

function montantFormate(montant) {
    // Vérification si le montant est négatif
    const isNegative = montant < 0;

    // Si le montant est négatif, on l'affiche en rouge, sinon en vert

    return (
        <span
            className={
                isNegative
                    ? "text-red-500 font-bold"
                    : "text-green-500 font-bold"
            }
        >
            {montant}€
        </span>
    );
}
