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
let currentTransactionIndex = null;

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

document
    .getElementById("transaction-form")
    .addEventListener("submit", function (e) {
        e.preventDefault();
        const date = document.getElementById("date").value;
        const type = document.getElementById("revenu-depense").value;
        const description = document.getElementById("description").value;
        const montant =
            type === "depense"
                ? -parseInt(document.getElementById("montant").value)
                : parseInt(document.getElementById("montant").value);
        const recurrent = document.getElementById("recurrent").checked;

        if (currentTransactionIndex !== null) {
            // Modifier la transaction existante
            transactions[currentTransactionIndex] = {
                date: date,
                montant: montant,
                type: type,
                description: description,
                solde: getSolde() + montant,
                recurrent: recurrent,
                lastExecution: date,
            };
            currentTransactionIndex = null;
            //remet la valeur du bouton submit a créer une nouvelle transaction
            document.getElementById("submit-button").value =
                "Créer une nouvelle transaction";
        } else {
            // Ajouter une nouvelle transaction
            const transaction = {
                date: date,
                montant: montant,
                type: type,
                description: description,
                solde: getSolde() + montant,
                recurrent: recurrent,
                lastExecution: date,
            };
            transactions.push(transaction);
        }

        localStorage.setItem("transactions", JSON.stringify(transactions));
        displayTransactions();
        this.reset();
        dateInputReset();
        displaySolde();
    });

function handleRecurringTransactions() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    transactions.forEach((transaction) => {
        if (transaction.recurrent) {
            const lastExecutionDate = new Date(transaction.lastExecution);
            const lastMonth = lastExecutionDate.getMonth();
            const lastYear = lastExecutionDate.getFullYear();

            // Ajouter une nouvelle transaction uniquement si elle n'a pas été exécutée pour le mois actuel
            if (
                currentYear > lastYear ||
                (currentYear === lastYear && currentMonth > lastMonth)
            ) {
                const newTransaction = {
                    ...transaction,
                    solde: getSolde() + transaction.montant,
                    date: addMonthToDate(transaction.date),
                    lastExecution: `${currentYear}-${String(
                        currentMonth + 1
                    ).padStart(2, "0")}-01`,
                };

                delete newTransaction.lastExecution; // Supprimer la date précédente pour éviter la confusion

                // Ajouter la nouvelle transaction
                transactions.push(newTransaction);

                // Mettre à jour la date de dernière exécution dans l'ancienne transaction
                transaction.lastExecution = newTransaction.lastExecution;
            }
        }
    });

    // Sauvegarder les modifications dans le localStorage
    localStorage.setItem("transactions", JSON.stringify(transactions));
}

// Fonction qui ajoute 1 mois à une date au format YYYY-MM-DD
function addMonthToDate(dateString) {
    const date = new Date(dateString);
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split("T")[0];
}

function displayTransactions() {
    console.log(transactions);
    const transactionElement = document.getElementById("transactions");
    transactionElement.innerHTML = ""; // Effacer le contenu existant

    // Trier les transactions par date descendant
    transactions.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
    });

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
            transactionElement.appendChild(monthYearElement);

            groupedTransactions[monthYear].forEach((transaction, index) => {
                const transactionObj = transaction; // Convertir l'objet JSON en objet JavaScript

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

                transactionObj.type === "revenu"
                    ? transactionDiv.classList.add("revenu")
                    : transactionDiv.classList.add("depense");

                if (transactionObj.recurrent)
                    transactionDiv.classList.add("recurrent");

                const dateParagraph = document.createElement("p");
                dateParagraph.textContent = `Date : ${formatDate(
                    transactionObj.date
                )}`;

                const montantParagraph = document.createElement("p");
                montantParagraph.textContent = `Montant : ${transactionObj.montant} €`;
                montantParagraph.className = "transaction-amount";

                const descriptionParagraph = document.createElement("p");
                if (transactionObj.description) {
                    descriptionParagraph.textContent = `Description : ${transactionObj.description}`;
                }

                const soldeParagraph = document.createElement("p");
                soldeParagraph.textContent = `Solde : ${transactionObj.solde} €`;

                const buttonSupprimer = document.createElement("button");
                buttonSupprimer.className = "supprimer-transaction";
                buttonSupprimer.setAttribute("data-index", index);

                // Créer l'icône Font Awesome
                const trashIcon = document.createElement("i");
                trashIcon.classList.add("fa-solid", "fa-trash");

                // Ajouter l'icône au bouton
                buttonSupprimer.appendChild(trashIcon);

                buttonSupprimer.addEventListener("click", function () {
                    const index = parseInt(this.getAttribute("data-index"));
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
                buttonModifier.setAttribute("data-index", index);
                buttonModifier.innerHTML =
                    '<i class="icon-edit fa-solid fa-pen"></i>';
                buttonModifier.addEventListener("click", function () {
                    const index = parseInt(this.getAttribute("data-index"));
                    editTransaction(index);
                    //scroll to #transaction-form
                    document
                        .getElementById("transaction-form")
                        .scrollIntoView({ behavior: "smooth" });
                });

                // Ajouter les éléments au div de la transaction
                transactionDetails.appendChild(dateParagraph);
                transactionDetails.appendChild(montantParagraph);

                if (transactionObj.description) {
                    transactionDetails.appendChild(descriptionParagraph);
                }
                transactionDetails.appendChild(soldeParagraph);

                transactionDiv.appendChild(transactionIcon);
                transactionDiv.appendChild(transactionDetails);
                transactionDiv.appendChild(buttonModifier);
                transactionDiv.appendChild(buttonSupprimer);

                // Ajouter le div de la transaction au conteneur des transactions
                transactionElement.appendChild(transactionDiv);
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

    soldeElement.innerHTML = `
        <p>Solde actuel : ${soldeActuel} €</p>
        <p>Solde projeté : ${soldeProjete} €</p>
    `;
}

document.getElementById("reset-button").addEventListener("click", function () {
    // Effacer les transactions
    transactions = [];
    localStorage.setItem("transactions", JSON.stringify(transactions));

    // Mettre à jour l'affichage
    displayTransactions();
    displaySolde();
});

function editTransaction(index) {
    const transaction = transactions[index];
    document.getElementById("date").value = transaction.date;
    document.getElementById("montant").value = Math.abs(transaction.montant);
    document.getElementById("revenu-depense").value = transaction.type;
    document.getElementById("description").value = transaction.description;
    document.getElementById("recurrent").checked = transaction.recurrent;
    document.getElementById("submit-button").value = "Modifier la transaction";
    currentTransactionIndex = index;
}
