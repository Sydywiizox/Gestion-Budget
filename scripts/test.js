/**
     * Renvoie la date décalée selon les paramètres donnés.
     * @param {string} date - La date initiale au format "YYYY-MM-DD".
     * @param {number} step - Le pas à ajouter à la date initiale.
     * @param {string} unit - L'unité de la date à décaler ("annees", "mois", "jours").
     * @param {number} value - La valeur du décalage (nombre d'années, mois ou jours).
     * @returns {string} - La nouvelle date au format "YYYY-MM-DD".
     */
function formatDate(date, step, unit, value) {
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

//génreres des test de date
const date = "2023-01-01"; // Date de départ (format YYYY-MM-DD)
const step = 3; // Pas (nombre de jours, de mois ou d'années)
const unit = "annees"; // Unité de la date à décaler ("jours", "mois", "annees")
const value = 1; // Valeur du décalage (nombre de jours, de mois ou d'années)

const result = formatDate(date, step, unit, value);
console.log(result);