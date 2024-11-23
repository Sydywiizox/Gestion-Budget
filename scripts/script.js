import { Transaction } from "./Transaction.js";
import { Transactions } from "./Transactions.js";

import { TransactionRecurrent } from "./TransactionRecurrent.js";

const transactionForm = document.getElementById("transaction-form");
let previousMonth = null; // Variable pour suivre le mois précédent
var mois = 1;
var date = new Date(2019, 0, 1);
let isTodaySet = false;
let isFutureSet = false;
// Si "date" vaut : 'Tue Jan 01 2019 00:00:00 GMT+0100 (heure normale d’Europe centrale)'

dateAddMonths(mois, date);
function dateAddMonths(a, b) {
    var d = new Date(b || new Date()),
        c = new Date(d.getFullYear(), d.getMonth() + 1 + a, 0).getDate();
    if (d.getDate() > c) {
        d.setDate(c);
    }
    d.setMonth(d.getMonth() + a);
    return d;
}

// Instancier une liste de transactions
const transactions = new Transactions();
// Charger les transactions depuis le localStorage
loadTransactions();
// Références aux éléments DOM
const totalBalanceElement = document.getElementById("total-balance");
const transactionTableBody = document.getElementById("transaction-table-body");
// Initialiser le formulaire
document.getElementById("date").value = moment().format("YYYY-MM-DD");
updateDisplay();
document.getElementById("cancel").style.display = "none";
// Mettre à jour le gestionnaire d'événements pour la soumission du formulaire
transactionForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const montantInput = document.getElementById("montant");
    const date = document.getElementById("date").value;
    const montant = parseFloat(montantInput.value);
    const description = document.getElementById("description").value;
    const type = document.getElementById("type").value;

    // Vérifier si nous éditons une transaction existante
    const editIndex = document
        .getElementById("transaction-form")
        .getAttribute("data-edit-index");

    if (editIndex !== null) {
        // Nous modifions une transaction existante
        transactions.transactionList[editIndex].editTransaction(
            date,
            Math.abs(montant),
            description,
            type
        );
    } else {
        // Créer une nouvelle transaction
        const newTransaction = new Transaction(
            date,
            montant,
            description,
            type
        );
        transactions.addTransaction(newTransaction);
    }

    // Sauvegarder les transactions dans le localStorage
    saveTransactions();

    // Réinitialiser l'indicateur de modification
    document
        .getElementById("transaction-form")
        .removeAttribute("data-edit-index");

    // Mettre à jour l'affichage
    updateDisplay();

    // Réinitialiser le formulaire
    document.getElementById("submit").textContent = "Ajouter";
    montantInput.value = "";
    document.getElementById("description").value = "";
    montantInput.focus();
});

const typeSelect = document.getElementById("type");
typeSelect.addEventListener("change", changeSelectColor);
const typeRecurrentSelect = document.getElementById("recurrent-type");
typeRecurrentSelect.addEventListener("change", changeSelectColor);
function changeSelectColor() {
    const selectElement = document.getElementById("type");

    // Supprimez les anciennes classes
    selectElement.classList.remove("select-revenu", "select-depense");

    // Ajoutez la classe en fonction de la sélection
    if (selectElement.value === "revenu") {
        selectElement.classList.add("select-revenu");
    } else if (selectElement.value === "depense") {
        selectElement.classList.add("select-depense");
    }
    const selectRecurrentElement = document.getElementById("recurrent-type");

    // Supprimez les anciennes classes
    selectRecurrentElement.classList.remove("select-revenu", "select-depense");

    // Ajoutez la classe en fonction de la sélection
    if (selectRecurrentElement.value === "revenu") {
        selectRecurrentElement.classList.add("select-revenu");
    } else if (selectRecurrentElement.value === "depense") {
        selectRecurrentElement.classList.add("select-depense");
    }
}

// Appelez la fonction pour appliquer la couleur par défaut (en cas de page déjà chargée)
changeSelectColor();

// Selection le bouton reset
const resetButton = document.getElementById("reset");
resetButton.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("date").value = moment().format("YYYY-MM-DD");
    document.getElementById("montant").value = "";
    document.getElementById("description").value = "";
    document.getElementById("type").value = "revenu";
    changeSelectColor();
});

// Fonction pour sauvegarder les transactions dans le localStorage
function saveTransactions() {
    const transactionsData = JSON.stringify(transactions.transactionList);
    localStorage.setItem("transactions", transactionsData);
}

// Fonction pour charger les transactions depuis le localStorage
function loadTransactions() {
    const savedTransactions = localStorage.getItem("transactions");
    if (savedTransactions) {
        const parsedTransactions = JSON.parse(savedTransactions);
        parsedTransactions.forEach((transactionData) => {
            const transaction = new Transaction(
                transactionData.date,
                transactionData.montant,
                transactionData.description,
                transactionData.type
            );
            transactions.addTransaction(transaction);
        });
    }
}

// Fonction pour mettre à jour l'affichage du solde et des transactions
function updateDisplay() {
    isTodaySet = false;
    isFutureSet = false;
    // Calcul du solde total
    transactions.calculateCumulativeBalances();
    // Calculer le solde actuel
    const currentBalance = transactions.soldeCurrent;
    let negOrPos = currentBalance.toFixed(2) <= 0 ? "negatif" : "positif";
    totalBalanceElement.innerHTML = `<span class="${negOrPos}-solde">${currentBalance.toFixed(
        2
    )} €</span>`; // Solde actuel

    // Calculer le solde projeté
    const projectedBalance = transactions.soldeTotal;
    const plannedBalanceElement = document.getElementById("planned-balance");
    negOrPos = projectedBalance.toFixed(2) <= 0 ? "negatif" : "positif";
    let negOrPos2 =
        (projectedBalance - currentBalance).toFixed(2) < 0
            ? "negatif"
            : "positif";
    plannedBalanceElement.innerHTML = `<span class="${negOrPos}-solde">${projectedBalance.toFixed(
        2
    )} €</span> <span class="${negOrPos2}-solde">(${(
        projectedBalance - currentBalance
    ).toFixed(2)} €)</span>`;
    // Solde projeté

    // Mettre à jour le tableau des transactions
    transactionTableBody.innerHTML = ""; // Réinitialiser le tableau

    transactions.sortTransactionsByDate("asc");
    transactions.transactionList.forEach((transaction, index) => {
        addTransactionToTable(transaction, index, transactionTableBody);
    });
}

function addTransactionToTable(transaction, index, tableBody) {
    if (
        !isTodaySet &&
        transaction.compareTo(
            transactions.getFirstTransaction(new Date(transaction.date))
        ) &&
        moment(transaction.date).format("YYYY-MM-DD") >
            moment().format("YYYY-MM-DD")
    ) {
        console.log("today " + transaction);
        isTodaySet = true;
        const todayRow = document.createElement("tr");
        todayRow.innerHTML = `
                <td colspan="6" class="today">Aujourd'hui</td>
            `;
        tableBody.prepend(todayRow);
    }
    const row = document.createElement("tr");

    // Ajouter les colonnes
    let type = "";
    if (transaction.type === "revenu") {
        type = "Revenu";
        row.classList.add("revenu");
    } else if (transaction.type === "depense") {
        type = "Dépense";
        row.classList.add("depense");
    }

    row.innerHTML = `
        <td>${transaction.date.toLocaleDateString("fr-FR")}</td>
        <td class="montant ${transaction.type}">${transaction.montant.toFixed(2)} €</td>
        <td>${transaction.description || ""}</td>
        <td>${type}</td>
        <td class="solde ${transaction.soldeCumulatif.toFixed(2) > 0 ? "positif" : "negatif"}">${transaction.soldeCumulatif.toFixed(2)} €</td>
        <td>
            <!-- Boutons Edit et Delete -->
            <div class="actions">
            <button class="edit-btn" data-index="${index}"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="delete-btn" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
            </div>
        </td>
    `;

    // Ajouter les boutons d'action à chaque ligne
    const editButton = row.querySelector(".edit-btn");
    const deleteButton = row.querySelector(".delete-btn");

    // Ajouter l'événement pour le bouton "Edit"
    editButton.addEventListener("click", () => editTransaction(index));

    // Ajouter l'événement pour le bouton "Delete"
    deleteButton.addEventListener("click", () => deleteTransaction(index));

    // Ajouter la ligne au tableau
    tableBody.prepend(row);

    //si la transaction est aujourd'hui au plus tôt alors créer une row "Ajourd'hui"
    console.log(transaction.date);
    console.log(moment(transaction.date).format("YYYY-MM-DD"));
    console.log(moment().format("YYYY-MM-DD"));
    console.log(
        moment(transaction.date).format("YYYY-MM-DD") >=
            moment().format("YYYY-MM-DD")
    );
    if (
        !isTodaySet &&
        moment(transaction.date).format("YYYY-MM-DD") ===
            moment().format("YYYY-MM-DD") &&
        transaction.compareTo(
            transactions.getLastTransaction(new Date(transaction.date))
        )
    ) {
        console.log("today " + transaction);
        isTodaySet = true;
        const todayRow = document.createElement("tr");
        todayRow.innerHTML = `
                <td colspan="6" class="today">Ajourd'hui</td>
            `;
        tableBody.prepend(todayRow);
    }

    const currentMonth = new Date(transaction.date).toLocaleString("fr-FR", {
        month: "long",
        year: "numeric",
    });
    // Ajouter une ligne indiquant le changement de mois si nécessaire
    if (
        currentMonth !== previousMonth &&
        transaction.compareTo(
            transactions.getLastTransactionOfMonth(new Date(transaction.date))
        )
    ) {
        const monthRow = document.createElement("tr");
        monthRow.classList.add("month-row");
        let monthSolde = transactions
            .soldeMonth(new Date(transaction.date))
            .toFixed(2);
        let negOrPos = monthSolde <= 0 ? "negatif" : "positif";
        monthRow.innerHTML = `
            <td colspan="6" class="month-header">${currentMonth} <span class="${negOrPos}-solde">(solde : ${monthSolde} €)</span></td>
        `;
        tableBody.prepend(monthRow);
        previousMonth = currentMonth; // Mettre à jour le mois précédent
    }
    if (
        new Date(transaction.date) > new Date() &&
        isFutureSet == false &&
        transactions.isLastTransaction(transaction)
    ) {
        console.log(transaction);
        isFutureSet = true;
        const futureRow = document.createElement("tr");
        futureRow.innerHTML = `
            <td colspan="6" class="future">à venir</td>
        `;
        tableBody.prepend(futureRow);
    }
}

// Fonction pour éditer une transaction
function editTransaction(index) {
    //scroll smooth to top
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.getElementById("submit").textContent = "Modifier";
    //récupère le bouton de annulation #cancel
    const cancelButton = document.getElementById("cancel");
    cancelButton.style.display = "block";
    cancelButton.addEventListener("click", (e) => {
        e.preventDefault();
        document
            .getElementById("transaction-form")
            .removeAttribute("data-edit-index");
        cancelButton.style.display = "none";
        // Mettre à jour l'affichage
        updateDisplay();

        // Réinitialiser le formulaire
        document.getElementById("submit").textContent = "Ajouter";
        document.getElementById("montant").value = "";
        document.getElementById("description").value = "";
        document.getElementById("montant").focus();
        document.getElementById("date").value = moment().format("YYYY-MM-DD");
        document.getElementById("type").value = "revenu";
        changeSelectColor();
    });

    const transaction = transactions.transactionList[index];

    // Remplir le formulaire avec les valeurs actuelles de la transaction
    document.getElementById("date").value = moment(transaction.date).format(
        "YYYY-MM-DD"
    );
    document.getElementById("montant").value = Math.abs(transaction.montant); // Forcer en positif pour le champ transaction.montant;
    document.getElementById("description").value = transaction.description;
    document.getElementById("type").value = transaction.type;

    // Optionnel : Ajouter un indicateur pour savoir que c'est une modification
    // Par exemple, ajouter un champ caché avec l'index de la transaction modifiée.
    // Cela permet de savoir si on doit ajouter une nouvelle transaction ou modifier une existante.
    document
        .getElementById("transaction-form")
        .setAttribute("data-edit-index", index);
    //focus on montant
    document.getElementById("montant").focus();
    changeSelectColor();
}

// Fonction pour supprimer une transaction
function deleteTransaction(index) {
    // Supprimer la transaction de la liste
    transactions.removeTransaction(index);

    // Sauvegarder les transactions après la suppression
    saveTransactions();

    // Mettre à jour l'affichage après suppression
    updateDisplay();
}

//Afficher / masquer les transactions plannifiées
//ajoute l'event listener au bouton
document
    .getElementById("recurrent-transaction-button")
    .addEventListener("click", togglePlannedTransactions);
togglePlannedTransactions();
function togglePlannedTransactions() {
    const button = document.getElementById("recurrent-transaction-button");
    button.textContent =
        button.textContent === "Afficher le plannificateur"
            ? "Masquer le plannificateur"
            : "Afficher le plannificateur";
    const recurrentTransactionSection = document.getElementById(
        "recurrent-transaction-section"
    );
    recurrentTransactionSection.style.display =
        recurrentTransactionSection.style.display === "none" ? "block" : "none";
}

// Récupérer le formulaire de transaction récurrente
const recurrentForm = document.getElementById("recurrent-form");
const plannedTransactionTableBody = document.getElementById(
    "planned-transaction-table-body"
);
const resetRecurrentButton = document.getElementById("recurrent-reset");

// Gérer l'ajout de transactions récurrentes
recurrentForm.addEventListener("submit", function (event) {
    event.preventDefault(); // Empêche le rechargement de la page lors de la soumission du formulaire

    // Récupérer les données du formulaire
    const date = document.getElementById("recurrent-date").value;
    const end = document.getElementById("recurrent-date-end").value;
    const montant = parseFloat(
        document.getElementById("recurrent-montant").value
    );
    const description = document.getElementById("recurrent-description").value;
    const type = document.getElementById("recurrent-type").value;
    const recurrenceUnit = document.getElementById("unit").value;
    const recurrenceValue = parseInt(document.getElementById("step").value);

    // Créer une instance de TransactionRecurrent
    const transactionRecurrent = new TransactionRecurrent(
        date,
        montant,
        description,
        type,
        recurrenceUnit,
        recurrenceValue
    );

    // Générer les occurrences pour une période donnée (par exemple, 1 an)
    const endDate = moment(end).format("YYYY-MM-DD"); // Période d'1 an
    const occurrences = transactionRecurrent.generateOccurrences(endDate, true);

    // Ajouter les occurrences dans le tableau des transactions
    occurrences.forEach((transaction) => {
        transactions.addTransaction(transaction);
        updateDisplay();
    });
    saveTransactions();

    // Effacer le contenu du formulaire sauf les champs de date
    document.getElementById("recurrent-montant").value = "";
    document.getElementById("recurrent-description").value = "";
    document.getElementById("unit").value = "mois";
    document.getElementById("step").value = 1;
});

// Réinitialiser le tableau des transactions récurrentes
resetRecurrentButton.addEventListener("click", (e) => {
    e.preventDefault();
    resetRecurrentForm();
});
resetRecurrentForm();
function resetRecurrentForm() {
    //reset le formulaire et mes la date du jour avec moment()
    document.getElementById("recurrent-date").value =
        moment().format("YYYY-MM-DD");
    document.getElementById("recurrent-date-end").value = moment()
        .add(1, "year")
        .format("YYYY-MM-DD");
    document.getElementById("recurrent-montant").value = "";
    document.getElementById("recurrent-description").value = "";
    document.getElementById("unit").value = "mois";
    document.getElementById("step").value = 1;
}
