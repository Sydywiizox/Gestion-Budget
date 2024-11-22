import { Transaction } from "./Transaction.js";
export class Transactions {
    constructor() {
        this.transactionList = [];
        this.soldeTotal = 0;
        this.soldeCurrent = 0;
    }

    /**
     * Ajoute une nouvelle transaction à la liste.
     * @param {Transaction} transaction - Instance de la classe Transaction.
     */
    addTransaction(transaction) {
        if (transaction instanceof Transaction) {
            // Vérifier le type et ajuster le montant si nécessaire
            if (transaction.type === "depense" && transaction.montant > 0) {
                transaction.montant = -Math.abs(transaction.montant); // Forcer en négatif
            }
            this.transactionList.push(transaction);
        } else {
            throw new Error(
                "L'élément ajouté doit être une instance de la classe Transaction."
            );
        }
    }

    /**
     * Supprime une transaction par son index.
     * @param {number} index - Index de la transaction à supprimer.
     */
    removeTransaction(index) {
        if (index >= 0 && index < this.transactionList.length) {
            this.transactionList.splice(index, 1);
        } else {
            throw new Error("Index invalide.");
        }
    }

    /**
     * Trie les transactions par date.
     * @param {string} order - Ordre du tri : 'asc' (croissant) ou 'desc' (décroissant).
     */
    sortTransactionsByDate(order = "asc") {
        this.transactionList.sort((a, b) => {
            if (order === "asc") {
                return a.date - b.date; // Tri croissant
            } else if (order === "desc") {
                return b.date - a.date; // Tri décroissant
            } else {
                throw new Error(
                    "Ordre de tri non valide. Utilisez 'asc' ou 'desc'."
                );
            }
        });
    }

    /**
     * Filtre les transactions par type.
     * @param {string} type - Type de transaction : 'dépense' ou 'revenu'.
     * @returns {Transaction[]} - Transactions correspondant au type.
     */
    filterByType(type) {
        return this.transactionList.filter(
            (transaction) => transaction.type === type
        );
    }

    /**
     * Retourne toutes les transactions pour un mois donné.
     * @param {Date} date - Date du mois à filtrer.
     * @returns {Transaction[]} - Transactions du mois donné.
     */
    getMonthlyTransactions(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        return this.transactionList.filter((transaction) => {
            const transactionDate = new Date(transaction.date);
            return (
                transactionDate.getFullYear() === year &&
                transactionDate.getMonth() === month
            );
        });
    }

    /**
     * Retourne un résumé des transactions.
     * @returns {string[]} - Liste des résumés de transactions.
     */
    getTransactionSummaries() {
        return this.transactionList.map((transaction) => transaction.summary());
    }

    /**
     * Calcule le solde cumulatif pour chaque transaction.
     * @param {number} [initialBalance=0] - Solde initial.
     * @returns {Transaction[]} - La liste des transactions avec le solde cumulatif.
     */
    calculateCumulativeBalances(initialBalance = 0) {
        // Trier les transactions par date
        this.transactionList.sort(
            (a, b) => new Date(a.date) - new Date(b.date)
        );

        let soldeCumulatif = initialBalance;
        let soldeCurrent = initialBalance; // Initialiser soldeCurrent à initialBalance

        // Obtenir la date d'aujourd'hui
        const today = new Date();

        // Parcourir chaque transaction pour calculer le solde cumulé et le solde actuel
        this.transactionList.forEach((transaction) => {
            const montantEffectif =
                transaction.type === "dépense"
                    ? -transaction.montant
                    : transaction.montant;

            // Mettre à jour le solde cumulé
            soldeCumulatif += montantEffectif;
            transaction.soldeCumulatif = soldeCumulatif; // Assigner le solde cumulé à la transaction

            // Mettre à jour soldeCurrent uniquement pour les transactions passées ou aujourd'hui
            if (new Date(transaction.date) <= today) {
                soldeCurrent += montantEffectif;
            }
        });

        // Mettre à jour les attributs de la classe avec les résultats calculés
        this.soldeCurrent = soldeCurrent;
        this.soldeTotal = soldeCumulatif;

        return this.transactionList; // Retourner la liste des transactions mise à jour
    }

    /**
     * Calcule le solde cumulé pour un mois donné.
     * @param {Date} month - Une date du mois pour lequel le solde doit être calculé.
     * @returns {number} - Le solde cumulé pour le mois donné.
     */
    soldeMonth(month) {
        const year = month.getFullYear();
        const monthIndex = month.getMonth();

        // Filtrer les transactions du mois donné
        const monthlyTransactions = this.transactionList.filter((transaction) => {
            const transactionDate = new Date(transaction.date);
            return (
                transactionDate.getFullYear() === year &&
                transactionDate.getMonth() === monthIndex
            );
        });

        // Calculer le solde pour les transactions du mois
        const soldeMonth = monthlyTransactions.reduce((solde, transaction) => {
            const montantEffectif =
                transaction.type === "dépense"
                    ? -transaction.montant
                    : transaction.montant;
            return solde + montantEffectif;
        }, 0);

        return soldeMonth; // Retourner le solde cumulé pour le mois
    }

    //renvoie si c est la derniere transaction
    isLastTransaction(transaction) {
        return (
            this.transactionList.indexOf(transaction) ===
            this.transactionList.length - 1
        );
    }

    //regarde toutes les transactions d'une date et renvoie la derniere
    getLastTransaction(date) {
        //récuper un tableau des transactions d'une date
        const filteredTransactions = this.transactionList.filter(
            (transaction) => moment(transaction.date).format("YYYY-MM-DD") === moment(date).format("YYYY-MM-DD")
        );
        console.log(filteredTransactions);
        //si il y a des transactions
        if (filteredTransactions.length > 0) {
            //renvoie la derniere transaction
            return filteredTransactions[filteredTransactions.length - 1];
        }
    }

    getFirstTransaction(date) {
        //récuper un tableau des transactions d'une date
        const filteredTransactions = this.transactionList.filter(
            (transaction) => moment(transaction.date).format("YYYY-MM-DD") === moment(date).format("YYYY-MM-DD")
        );
        console.log(filteredTransactions);
        //si il y a des transactions
        if (filteredTransactions.length > 0) {
            //renvoie la derniere transaction
            return filteredTransactions[0];
        }
    }

    //getLastTransactionOfMonth
    getLastTransactionOfMonth(date) {
        //récuper un tableau des transactions d'une date
        const filteredTransactions = this.transactionList.filter(
            (transaction) => moment(transaction.date).format("YYYY-MM") === moment(date).format("YYYY-MM")
        );
        console.log(filteredTransactions);
        //si il y a des transactions
        if (filteredTransactions.length > 0) {
            //renvoie la derniere transaction
            return filteredTransactions[filteredTransactions.length - 1];
        }
    }
}
