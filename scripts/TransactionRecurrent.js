import { Transaction } from "./Transaction.js";

export class TransactionRecurrent extends Transaction {
    /**
     * Crée une transaction récurrente.
     * @param {string} date - Date de la première occurrence (format YYYY-MM-DD).
     * @param {number} montant - Montant de la transaction.
     * @param {string} description - Description de la transaction.
     * @param {string} type - Type de transaction ("revenu" ou "depense").
     * @param {string} recurrenceUnit - Unité de récurrence ("jours", "mois", "annees").
     * @param {number} recurrenceValue - Valeur de récurrence (e.g., tous les 5 jours).
     */
    constructor(
        date,
        montant,
        description,
        type,
        recurrenceUnit,
        recurrenceValue
    ) {
        super(date, montant, description, type); // Appelle le constructeur de Transaction
        this.recurrenceUnit = recurrenceUnit; // "jours", "mois", "annees"
        this.recurrenceValue = recurrenceValue; // Nombre d'unités (e.g., tous les 5 jours)
    }

    /**
     * Génère toutes les occurrences de la transaction récurrente dans une période donnée.
     * @param {string} startDate - Date de début (format YYYY-MM-DD).
     * @param {string} endDate - Date de fin (format YYYY-MM-DD).
     * @returns {Transaction[]} - Liste des transactions générées.
     */
    generateOccurrences(endDate, before = true) {
        const occurrences = [];
        const end = moment(endDate); // Fin de la période
        let currentDate = moment(this.date); // Date de début de la transaction récurrente
        const start = currentDate; // Début de la période
        let step = 1;
        // Vérifier si la date initiale est dans la période
        while (((currentDate.isBefore(end) || currentDate.isSame(end, "day")))) {
            if(!before) before = currentDate.isSameOrAfter(moment());
            if (currentDate.isSameOrAfter(start) && before) {
                // Ajouter la transaction si la date est dans la période
                occurrences.push(
                    new Transaction(
                        currentDate.format("YYYY-MM-DD"),
                        this.montant,
                        this.description,
                        this.type
                    )
                );
            }
            // Calculer la prochaine date de récurrence en fonction de l'unité et de la valeur
            const nextDateString = this.formatDate(
                this.date, // Date initiale de la transaction récurrente
                step++, // Le "step" (fixé à 1 pour appliquer la récurrence de manière adéquate)
                this.recurrenceUnit, // Unité de récurrence (jours, mois, années)
                this.recurrenceValue // La valeur du décalage (e.g., tous les 2 mois)
            );

            // Mettre à jour currentDate avec la nouvelle date calculée
            currentDate = moment(nextDateString);
        }

        return occurrences;
    }

    /**
     * Renvoie la date décalée selon les paramètres donnés.
     * @param {string} date - La date initiale au format "YYYY-MM-DD".
     * @param {number} step - Le pas à ajouter à la date initiale.
     * @param {string} unit - L'unité de la date à décaler ("annees", "mois", "jours").
     * @param {number} value - La valeur du décalage (nombre d'années, mois ou jours).
     * @returns {string} - La nouvelle date au format "YYYY-MM-DD".
     */
    formatDate(date, step, unit, value) {
        const initialDate = moment(date); // Convertir la date initiale en moment

        let newDate;
        switch (unit) {
            case "jours":
                newDate = initialDate.add(value * step, "days");
                break;
            case "mois":
                newDate = initialDate.add(value * step, "months");
                break;
            case "annees":
                newDate = initialDate.add(value * step, "years");
                break;
            default:
                throw new Error("Unité de récurrence non valide.");
        }

        // Retourner la nouvelle date au format "YYYY-MM-DD"
        return newDate.format("YYYY-MM-DD");
    }
}


