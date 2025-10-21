import * as fs from 'node:fs/promises';
import neatCsv from 'neat-csv';

async function generateMarkdownFiles(datasetName: string) {
	const csv = Bun.file(`test/vaults/exampleData/${datasetName}.csv`);
	const text = await csv.text();

	const data = await neatCsv(text);

	console.log(`Found ${data.length} ${datasetName} entries`);

	if (await fs.exists(`test/vaults/exampleVault/${datasetName}`)) {
		await fs.rm(`test/vaults/exampleVault/${datasetName}`, { recursive: true });
	}

	await fs.mkdir(`test/vaults/exampleVault/${datasetName}`, { recursive: true });

	let i = 0;
	for (const entry of data) {
		const yaml = Object.entries(entry)
			.map(([key, value]) => `${key}: ${value}`)
			.join('\n');
		const content = `---\n${yaml}\n---\n`;

		const file = Bun.file(`test/vaults/exampleVault/${datasetName}/${i}.md`);
		await file.write(content);

		i++;
	}

	console.log(`Created ${data.length} ${datasetName} notes`);
}

generateMarkdownFiles('aapl');
generateMarkdownFiles('penguins');
generateMarkdownFiles('movies');

export {};
