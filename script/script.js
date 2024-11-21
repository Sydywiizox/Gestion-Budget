const dateInput = document.getElementById("date");
const today = new Date();
const year = today.getFullYear();
const month = today.getMonth() + 1; // janvier est 0, février est 1, etc.
const day = today.getDate();
console.log(localStorage.getItem("transactions"));
let transactions = localStorage.getItem("transactions")
    ? JSON.parse(localStorage.getItem("transactions"))
    : [];
let solde = getSolde();
let currentTransactionId = null;

document.getElementById("reset-button").addEventListener("click", function (e) {
    e.preventDefault();
});
handleRecurringTransactions();
displayTransactions();
displaySolde();

dateInputReset();
function dateInputReset() {
    dateInput.value = `${year}-${month.toString().padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}`;
}

// Calculer le solde en fonction de toutes les transactions avant la date actuelle
function getSolde() {
    let solde = 0;
    transactions.forEach((transaction) => {
        const transactionDate = new Date(transaction.date);
        if (transactionDate <= today) {
            solde += transaction.montant;
        }
    });
    return solde;
}

function getProjectedSolde() {
    let solde = 0;
    transactions.forEach((transaction) => {
        solde += transaction.montant;
    });
    return solde;
}

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

document
    .getElementById("transaction-form")
    .addEventListener("submit", function (e) {
        e.preventDefault();
        const date = document.getElementById("date").value;
        const type = document.getElementById("revenu-depense").value;
        const description = document.getElementById("description").value;
        const montant =
            type === "depense"
                ? -parseFloat(document.getElementById("montant").value)
                : parseFloat(document.getElementById("montant").value);
        const recurrent = document.getElementById("recurrent").checked;

        if (currentTransactionId !== null) {
            // Modifier la transaction existante
            const index = transactions.findIndex(
                (t) => t.id === currentTransactionId
            );
            transactions[index] = {
                id: currentTransactionId,
                date: date,
                montant: montant,
                type: type,
                description: description,
                recurrent: recurrent,
            };
            currentTransactionId = null;
            //remet la valeur du bouton submit a créer une nouvelle transaction
            document.getElementById("submit-button").value =
                "Créer une nouvelle transaction";
        } else {
            // Ajouter une nouvelle transaction
            const transaction = {
                id: generateUniqueId(),
                date: date,
                montant: montant,
                type: type,
                description: description,
                solde: getSolde() + montant,
                recurrent: recurrent,
                recurrentId: generateUniqueId(),
            };
            transactions.push(transaction);
        }

        localStorage.setItem("transactions", JSON.stringify(transactions));
        handleRecurringTransactions();
        displayTransactions();
        this.reset();
        dateInputReset();
        displaySolde();
    });
    function formatDateToYYYYMMDD(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    
    function compareDatesYYYYMMDD(date1, date2) {
        const [year1, month1, day1] = date1.split("-");
        const [year2, month2, day2] = date2.split("-");
        if (year1 === year2 && month1 === month2 && day1 === day2) {
            return false;
        } else if (year1 < year2 || (year1 === year2 && month1 < month2) || (year1 === year2 && month1 === month2 && day1 < day2)) {
            return false;
        } else {
            return true;
        }
    }
function handleRecurringTransactions() {
    // si une transaction est recurrente, on ajoute une nouvelle transaction avec la date du mois suivant si elle n'existe pas et qu'on est dans le mois en question
    transactions.forEach((transaction) => {
        if (transaction.recurrent) {
            const nextMonthDate = addMonthToDate(transaction.date);
            const today = formatDateToYYYYMMDD(new Date());

            //verifie si la transaction a le meme recurrentId que la transaction actuelle et la date nextmonthdate
            const existingTransaction = transactions.find(
                (t) =>
                    t.recurrentId === transaction.recurrentId &&
                    t.date === nextMonthDate
            );
            if (!existingTransaction && compareDates(today, nextMonthDate)) {
                const newTransaction = {
                    id: generateUniqueId(),
                    date: nextMonthDate,
                    montant: transaction.montant,
                    type: transaction.type,
                    description: transaction.description,
                    solde: getSolde() + transaction.montant,
                    recurrent: transaction.recurrent,
                    recurrentId: transaction.recurrentId,
                };
                transactions.push(newTransaction);
                handleRecurringTransactions();
                localStorage.setItem(
                    "transactions",
                    JSON.stringify(transactions)
                );
            }
        }
    });
}

// Fonction qui ajoute 1 mois à une date au format YYYY-MM-DD
//Je veux que si on met le 31/10/2023, il se mette au 30/11/2024 (si il n'y a pas de 31/11/2024)
function addMonthToDate(dateString) {
    const date = new Date(dateString);

    // Ajouter un mois
    date.setMonth(date.getMonth() + 1);

    // Vérifier si le jour d'origine est conservé
    if (date.getDate() < new Date(dateString).getDate()) {
        // Ajuster la date au dernier jour du mois si le mois suivant est plus court
        date.setDate(0); // Cela met la date au dernier jour du mois précédent
    }

    // Retourner la date au format YYYY-MM-DD
    return date.toISOString().split("T")[0];
}

//fonction qui compare deux dates au format YYYY-MM-DD et qui retourne si le mois + l'année de la date est passé
function compareDates(date1, date2) {
    const date1Parts = date1.split("-");
    const date2Parts = date2.split("-");
    const date1Year = parseInt(date1Parts[0]);
    const date1Month = parseInt(date1Parts[1]);
    const date2Year = parseInt(date2Parts[0]);
    const date2Month = parseInt(date2Parts[1]);

    console.log(date1Year, date1Month, date2Year, date2Month);
    return (
        date1Year > date2Year ||
        (date1Year === date2Year && date1Month >= date2Month)
    );
}


function displayTransactions() {
    console.log(transactions);
    let todayMarker = false
    const transactionElement = document.getElementById("transactions");
    transactionElement.innerHTML = ""; // Effacer le contenu existant

    // Trier les transactions par date descendant
    transactions.sort((b, a) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
    });

    let soldeTransactions = 0;
    // Regrouper les transactions par mois
    const groupedTransactions = {};
    transactions.forEach((transaction) => {
        const monthYear = getMonthYear(transaction.date);
        if (!groupedTransactions[monthYear]) {
            groupedTransactions[monthYear] = [];
        }
        groupedTransactions[monthYear].push(transaction);
    });

    // Afficher les transactions regroupées par mois
    for (const monthYear in groupedTransactions) {
        if (groupedTransactions.hasOwnProperty(monthYear)) {
            const monthYearElement = document.createElement("h3");
            monthYearElement.className = "month-year";
            monthYearElement.textContent = formatMonthYear(monthYear);

            groupedTransactions[monthYear].forEach((transaction) => {
                const transactionObj = transaction; // Convertir l'objet JSON en objet JavaScript
                // Ajouter "Aujourd’hui" avant la première transaction du jour
                console.log(transactionObj.date, formatDateToYYYYMMDD(today));
                
                if (compareDatesYYYYMMDD(transactionObj.date, formatDateToYYYYMMDD(today)) && !todayMarker) {
                    const todayDiv = document.createElement("div");
                    todayDiv.className = "today-marker";
                    todayDiv.textContent = "Aujourd'hui";
                    transactionElement.prepend(todayDiv);
                    todayMarker = true
                }
                // Créer les éléments HTML
                const transactionDiv = document.createElement("div");
                transactionDiv.className = "transaction";
                
                const transactionIcon = document.createElement("div");
                transactionIcon.className = "transaction-icon";
                const iconImg = document.createElement("i");
                iconImg.classList.add(
                    "fa-solid",
                    "icon-transaction",
                    transactionObj.type === "revenu"
                        ? "fa-piggy-bank"
                        : "fa-wallet"
                );
                transactionIcon.appendChild(iconImg);

                const transactionDetails = document.createElement("div");
                transactionDetails.className = "transaction-details";

                if (compareDatesYYYYMMDD(transactionObj.date, formatDateToYYYYMMDD(today))) {
                    transactionDiv.classList.add("futur-marker")
                }
                transactionObj.type === "revenu"
                    ? transactionDiv.classList.add("revenu")
                    : transactionDiv.classList.add("depense");

                if (transactionObj.recurrent)
                    transactionDiv.classList.add("recurrent");

                const dateParagraph = document.createElement("p");
                dateParagraph.textContent = `${formatDate(
                    transactionObj.date
                )}`;

                if(compareDatesYYYYMMDD(transactionObj.date, formatDateToYYYYMMDD(today))) {
                    // Create the <i> element
                    var iconElement = document.createElement('i');                    
                    // Set the class attribute
                    iconElement.className = 'fa-regular fa-calendar';
                }
                const montantParagraph = document.createElement("p");
                montantParagraph.textContent = `Montant : ${transactionObj.montant} €`;
                montantParagraph.className = "transaction-amount";

                const descriptionParagraph = document.createElement("p");
                if (transactionObj.description) {
                    descriptionParagraph.textContent = `Description : ${transactionObj.description}`;
                }

                const soldeParagraph = document.createElement("p");
                soldeTransactions += transactionObj.montant;
                soldeParagraph.textContent = `Solde : ${soldeTransactions} €`;

                const buttonSupprimer = document.createElement("button");
                buttonSupprimer.className = "supprimer-transaction";
                buttonSupprimer.setAttribute("data-id", transactionObj.id);

                // Créer l'icône Font Awesome
                const trashIcon = document.createElement("i");
                trashIcon.classList.add("fa-solid", "fa-trash");

                // Ajouter l'icône au bouton
                buttonSupprimer.appendChild(trashIcon);

                buttonSupprimer.addEventListener("click", function () {
                    const id = this.getAttribute("data-id");
                    const index = transactions.findIndex((t) => t.id === id);
                    transactions.splice(index, 1);
                    localStorage.setItem(
                        "transactions",
                        JSON.stringify(transactions)
                    );
                    displayTransactions();
                    displaySolde();
                });

                const buttonModifier = document.createElement("button");
                buttonModifier.className = "modifier-transaction";
                buttonModifier.setAttribute("data-id", transactionObj.id);
                buttonModifier.innerHTML =
                    '<i class="icon-edit fa-solid fa-pen"></i>';
                buttonModifier.addEventListener("click", function () {
                    const id = this.getAttribute("data-id");
                    const index = transactions.findIndex((t) => t.id === id);
                    editTransaction(index);
                    //scroll to #transaction-form
                    document
                        .getElementById("transaction-form")
                        .scrollIntoView({ behavior: "smooth" });
                });

                // Ajouter les éléments au div de la transaction
                transactionDetails.appendChild(dateParagraph);
                if(compareDatesYYYYMMDD(transactionObj.date, formatDateToYYYYMMDD(today))) transactionDetails.appendChild(iconElement);
                transactionDetails.appendChild(montantParagraph);               

                if (transactionObj.description) {
                    transactionDetails.appendChild(descriptionParagraph);
                }
                transactionDetails.appendChild(soldeParagraph);

                //mettre transaction icon et details dans une nouvelle div et l'ajouter au div de la transaction
                const transactionContent = document.createElement("div");
                transactionContent.appendChild(transactionIcon);
                transactionContent.appendChild(transactionDetails);
                transactionDiv.appendChild(transactionContent);
                const transactionButtons = document.createElement("div");
                transactionButtons.className = "transaction-buttons";
                transactionButtons.appendChild(buttonSupprimer);
                transactionButtons.appendChild(buttonModifier);
                transactionDiv.appendChild(transactionButtons);
                

                

                // Ajouter le div de la transaction au conteneur des transactions
                transactionElement.prepend(transactionDiv);
                transactionElement.prepend(monthYearElement);
                
            });
        }
    }
}

// Fonction pour obtenir le mois et l'année à partir d'une date
function getMonthYear(dateString) {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}`;
}

// Fonction pour formater le mois et l'année
function formatMonthYear(monthYear) {
    const [year, month] = monthYear.split("-");
    const months = [
        "Janvier",
        "Février",
        "Mars",
        "Avril",
        "Mai",
        "Juin",
        "Juillet",
        "Août",
        "Septembre",
        "Octobre",
        "Novembre",
        "Décembre",
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
}

// Fonction pour transformer YYYY-MM-DD en DD/MM/YYYY
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function displaySolde() {
    const soldeElement = document.getElementById("solde");
    const soldeActuel = getSolde();
    const soldeProjete = getProjectedSolde();

    //creer un element pour chaque solde ajoute la class "solde-negatif" si le solde est negatif
    const soldeActuelElement = document.createElement("p");
    if(soldeActuel < 0) soldeActuelElement.className = "solde-negatif";
    soldeActuelElement.textContent = `Solde actuel : ${soldeActuel} €`;

    const soldeProjeteElement = document.createElement("p");
    if(soldeProjete < 0) soldeProjeteElement.className = "solde-negatif";
    soldeProjeteElement.textContent = `Solde projeté : ${soldeProjete} €`;

    soldeElement.innerHTML = "";
    soldeElement.appendChild(soldeActuelElement);
    soldeElement.appendChild(soldeProjeteElement);

}

document.getElementById("reset-button").addEventListener("click", function () {
    // Ouvrir la modale de confirmation
    const modal = document.getElementById("confirmationModal");
    modal.style.display = "block";

    // Ajouter un gestionnaire d'événement pour le bouton de confirmation
    const confirmButton = document.getElementById("confirmReset");
    confirmButton.addEventListener("click", function () {
        // Fermer la modale
        modal.style.display = "none";

        // Effacer les transactions
        transactions = [];
        localStorage.setItem("transactions", JSON.stringify(transactions));

        // Mettre à jour l'affichage
        displayTransactions();
        displaySolde();
    });
    // Ajouter un gestionnaire d'événement pour le bouton d'annulation
    const cancelButton = document.getElementById("cancelReset");
    cancelButton.addEventListener("click", function () {
        // Fermer la modale
        modal.style.display = "none";
    });
});

function editTransaction(index) {
    const transaction = transactions[index];
    document.getElementById("date").value = transaction.date;
    document.getElementById("montant").value = Math.abs(transaction.montant);
    document.getElementById("revenu-depense").value = transaction.type;
    document.getElementById("description").value = transaction.description;
    document.getElementById("recurrent").checked = transaction.recurrent;
    document.getElementById("submit-button").value = "Modifier la transaction";
    currentTransactionId = transaction.id;
}
