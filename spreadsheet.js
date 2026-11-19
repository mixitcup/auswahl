'use strict';

const ignoredDuties = new Set(['#TeamOhneHüpfen', 'Unterstützer:in']);

function readRegistrations(bytes) {
    let workbook;
    try {
        workbook = XLSX.read(bytes, { sheets: 'Meldungen', cellHTML: false, nodim: true });
    } catch {
        throw new Error('Die Datei konnte nicht als XLSX-Arbeitsmappe gelesen werden.');
    }
    if (workbook.bookType !== 'xlsx') {
        throw new Error('Bitte eine XLSX-Arbeitsmappe auswählen.');
    }
    const sheet = workbook.Sheets.Meldungen;
    if (!sheet) throw new Error('Das Tabellenblatt „Meldungen“ fehlt.');

    // Start at Excel row 1 even if the first populated cell is farther down.
    const rows = XLSX.utils.sheet_to_json(sheet, { range: 0, header: 1, blankrows: true });
    const headers = (rows[0] || []).map(value => String(value).trim());
    const required = ['Uni', 'Name', 'Pflicht'];
    const columns = required.map(header => {
        const index = headers.indexOf(header);
        if (index === -1) throw new Error(`Zeile 1: Die Spalte „${header}“ fehlt.`);
        if (headers.lastIndexOf(header) !== index) {
            throw new Error(`Zeile 1: Die Spalte „${header}“ ist mehrfach vorhanden.`);
        }
        return index;
    });

    const registrations = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row.some(value => String(value ?? '').trim() !== '')) continue;
        if (ignoredDuties.has(String(row[columns[2]] ?? '').trim())) continue;
        const [uni, name, tag] = columns.map((column, field) => {
            const value = String(row[column] ?? '');
            if (!value.trim()) throw new Error(`Zeile ${i + 1}: „${required[field]}“ fehlt.`);
            return value;
        });
        const match = /^\[(\d+)\]\s+\S/u.exec(tag.trim());
        const level = match && Number(match[1]);
        if (!Number.isSafeInteger(level)) {
            throw new Error(`Zeile ${i + 1}: „Pflicht“ muss wie „[1] Eifrige Erdbeere“ aufgebaut sein.`);
        }

        const fullName = name.trim();
        const lastName = fullName.match(/\S+$/u)[0];
        const firstName = fullName.slice(0, fullName.length - lastName.length).trimEnd();
        registrations.push({ rowNumber: i + 1, uni, fullName, firstName, lastName, tag, level });
    }
    if (!registrations.length) throw new Error('Das Tabellenblatt „Meldungen“ enthält keine Meldungen mit Levelnummer.');
    return registrations;
}

function createRandom(seed) {
    if (!seed.trim()) return Math.random;
    let state = 2166136261;
    for (const character of seed) {
        state = Math.imul(state ^ character.codePointAt(0), 16777619);
    }
    // Mulberry32 advances once per draw, starting from the hash of the seed.
    return () => {
        state = (state + 0x6D2B79F5) | 0;
        let value = Math.imul(state ^ (state >>> 15), 1 | state);
        value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffle(items, random) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
}

function groupBy(items, key) {
    const groups = new Map();
    for (const item of items) {
        if (!groups.has(item[key])) groups.set(item[key], []);
        groups.get(item[key]).push(item);
    }
    return groups;
}

function createTeams(registrations, teamSize, seed = '') {
    if (!Number.isInteger(teamSize) || teamSize < 2 || teamSize > 20) {
        throw new Error('Bitte eine ganze Teamgröße zwischen 2 und 20 wählen.');
    }
    const random = createRandom(seed);
    const result = [];
    const levels = groupBy(registrations, 'level');
    for (const level of [...levels.keys()].sort((a, b) => a - b)) {
        const entries = levels.get(level);
        const teams = Array.from({ length: Math.ceil(entries.length / teamSize) }, (_, i) => ({
            id: `L${level}T${i + 1}`, level, members: []
        }));
        const universities = [...groupBy(entries, 'uni').values()].sort((a, b) => b.length - a.length);
        for (const university of universities) {
            shuffle(university, random);
            // In each round, visit every team once. Prefer smaller teams and
            // shuffle to break size ties. Before each round, all teams have
            // received the same number of people from this university.
            for (let start = 0; start < university.length; start += teams.length) {
                const order = [...teams];
                shuffle(order, random);
                order.sort((a, b) => a.members.length - b.members.length);
                const batch = university.slice(start, start + teams.length);
                batch.forEach((person, i) => {
                    const team = order[i];
                    team.members.push(person);
                });
            }
        }
        for (const team of teams) result.push(team);
    }
    return result;
}

function createExportWorkbook(teams) {
    const rows = [['Verein', 'Vorname', 'Nachname', 'Tags', 'Team-Nr']];
    for (const team of teams) {
        for (const person of team.members) {
            rows.push([person.uni, person.firstName, person.lastName, person.tag, team.id]);
        }
    }
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = [24, 22, 22, 36, 12].map(wch => ({ wch }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Teams');
    return workbook;
}
