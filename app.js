'use strict';

(() => {
    const byId = id => document.getElementById(id);
    const fileInput = byId('registrationsFile');
    const generateBtn = byId('generateBtn');
    const exportBtn = byId('exportTeamsBtn');
    const errorBox = byId('error');
    let registrations = [];
    let teams = [];
    let importVersion = 0;

    function clearResults() {
        teams = [];
        byId('teamsContainer').replaceChildren();
        byId('stats').hidden = true;
        exportBtn.hidden = true;
    }

    function clearImport() {
        importVersion++;
        registrations = [];
        clearResults();
        generateBtn.disabled = true;
        byId('previewRows').replaceChildren();
        byId('preview').hidden = true;
        byId('resetBtn').hidden = !fileInput.files.length;
        byId('importStatus').textContent = '';
        errorBox.hidden = true;
    }

    function element(tag, text, className) {
        const node = document.createElement(tag);
        node.textContent = text;
        if (className) node.className = className;
        return node;
    }

    function showError(message) {
        errorBox.textContent = message;
        errorBox.hidden = false;
    }

    if (!window.XLSX) {
        fileInput.disabled = true;
        showError('Die XLSX-Bibliothek konnte nicht geladen werden. Bitte die Internetverbindung prüfen und die Seite neu laden.');
        return;
    }

    fileInput.addEventListener('change', async () => {
        clearImport();
        const version = importVersion;
        const file = fileInput.files[0];
        if (!file) return;
        if (!/\.xlsx$/i.test(file.name)) {
            showError('Bitte eine Datei mit der Endung .xlsx auswählen.');
            return;
        }
        byId('importStatus').textContent = 'Meldungen werden eingelesen …';
        try {
            const bytes = await file.arrayBuffer();
            if (version !== importVersion) return;
            registrations = readRegistrations(bytes);
            const rows = document.createDocumentFragment();
            for (const entry of registrations) {
                const tr = document.createElement('tr');
                tr.append(element('td', entry.uni), element('td', entry.fullName), element('td', entry.tag));
                rows.append(tr);
            }
            byId('previewRows').replaceChildren(rows);
            byId('preview').hidden = false;
            byId('importStatus').textContent = `Importierte Meldungen: ${registrations.length}`;
            generateBtn.disabled = false;
        } catch (error) {
            if (version !== importVersion) return;
            byId('importStatus').textContent = '';
            showError(error instanceof DOMException ? 'Die Datei konnte nicht geöffnet werden.' : error.message);
        }
    });

    byId('resetBtn').addEventListener('click', () => {
        fileInput.value = '';
        clearImport();
    });
    for (const id of ['teamSize', 'seed']) {
        byId(id).addEventListener('input', () => {
            clearResults();
            if (registrations.length) errorBox.hidden = true;
        });
    }

    generateBtn.addEventListener('click', () => {
        clearResults();
        errorBox.hidden = true;
        try {
            teams = createTeams(registrations, byId('teamSize').valueAsNumber, byId('seed').value);
            const cards = document.createDocumentFragment();
            for (const team of teams) {
                const card = document.createElement('section');
                card.className = 'team-card';
                card.append(element('h2', team.id, 'team-header'));
                for (const person of team.members) {
                    const member = document.createElement('div');
                    member.className = 'team-member';
                    const info = document.createElement('div');
                    info.className = 'member-info';
                    info.append(element('p', person.fullName, 'member-name'), element('p', person.uni, 'member-uni'));
                    member.append(info);
                    card.append(member);
                }
                cards.append(card);
            }
            byId('teamsContainer').replaceChildren(cards);
            byId('totalPeople').textContent = registrations.length;
            byId('totalTeams').textContent = teams.length;
            byId('totalLevels').textContent = new Set(teams.map(team => team.level)).size;
            byId('stats').hidden = false;
            exportBtn.hidden = false;
        } catch (error) {
            showError(error.message);
        }
    });

    exportBtn.addEventListener('click', () => {
        if (teams.length) XLSX.writeFileXLSX(createExportWorkbook(teams), 'mixitcup_teams.xlsx');
    });
})();
