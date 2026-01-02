import fs from 'fs';

export const readJSON = (filePath) =>
    JSON.parse(fs.readFileSync(filePath, 'utf-8'));

export const writeJSON = (filePath, data) =>
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
