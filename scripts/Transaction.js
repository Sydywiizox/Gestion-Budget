export class Transaction {
    constructor(date, montant, description = "", type = "depense") {
        // Valider et initialiser les propriétés
        this.date = this.validateDate(date);
        this.montant = this.validateMontant(montant);
        this.description = description;
        this.type = this.validateType(type);
        this.soldeCumulatif = 0;
    }

    /**
     * Modifie une transaction avec de nouvelles valeurs.
     * @param {string|Date} date - La nouvelle date.
     * @param {number} montant - Le nouveau montant.
     * @param {string} description - La nouvelle description.
     * @param {string} type - Le nouveau type (revenu / depense).
     */
    editTransaction(date, montant, description, type) {
        this.date = this.validateDate(date);
        //verifie le type de la transaction
        if(type === "depense"){
            this.montant = -Math.abs(this.validateMontant(montant));
        } else if(type === "revenu"){
            this.montant = Math.abs(this.validateMontant(montant));
        }
        this.description = description || this.description;  // On garde la description si elle n'est pas modifiée
        this.type = this.validateType(type);
    }

    /**
     * Valide la date donnée.
     * @param {string|Date} date - La date de la transaction.
     * @returns {Date} - Un objet Date valide.
     * @throws {Error} - Si la date est invalide.
     */
    validateDate(date) {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate)) {
            throw new Error("Date invalide. Veuillez fournir une date valide.");
        }
        return parsedDate;
    }

    /**
     * Valide le montant donné.
     * @param {number} montant - Le montant de la transaction.
     * @returns {number} - Le montant valide.
     * @throws {Error} - Si le montant est invalide.
     */
    validateMontant(montant) {
        if (typeof montant !== "number" || isNaN(montant)) {
            throw new Error("Montant invalide. Veuillez fournir un nombre.");
        }
        return montant;
    }

    /**
     * Valide le type de la transaction (dépense ou revenu).
     * @param {string} type - Le type de la transaction.
     * @returns {string} - Le type valide.
     * @throws {Error} - Si le type est invalide.
     */
    validateType(type) {
        const validTypes = ["depense", "revenu"];
        if (!validTypes.includes(type)) {
            throw new Error(`Type invalide. Les types valides sont : ${validTypes.join(", ")}`);
        }
        return type;
    }

    /**
     * Formate la date en une chaîne lisible.
     * @returns {string} - La date formatée (exemple : 22/11/2024).
     */
    formatDate() {
        return this.date.toLocaleDateString("fr-FR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    }

    /**
     * Affiche un résumé de la transaction.
     * @returns {string} - Un résumé formaté.
     */
    summary() {
        return `Date : ${this.formatDate()}, Montant : ${this.montant} €, Type : ${this.type}, Description : ${this.description}`;
    }

    compareTo(otherTransaction) {
        //revoie true si tout est identique
        if(this.date === otherTransaction.date && this.montant === otherTransaction.montant && this.description === otherTransaction.description && this.type === otherTransaction.type){
            return true;
        }
        return false;
    }
}
