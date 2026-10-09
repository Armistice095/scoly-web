/** Les 12 départements du Bénin (utilisés à l'inscription et dans Paramètres). */
export const DEPARTEMENTS = [
	'Alibori',
	'Atacora',
	'Atlantique',
	'Borgou',
	'Collines',
	'Couffo',
	'Donga',
	'Littoral',
	'Mono',
	'Ouémé',
	'Plateau',
	'Zou'
];

/** Les 77 communes du Bénin, regroupées par département. */
export const COMMUNES_PAR_DEPARTEMENT: Record<string, string[]> = {
	Alibori: ['Banikoara', 'Gogounou', 'Kandi', 'Karimama', 'Malanville', 'Segbana'],
	Atacora: [
		'Boukoumbé',
		'Cobly',
		'Kérou',
		'Kouandé',
		'Matéri',
		'Natitingou',
		'Péhunco',
		'Tanguiéta',
		'Toucountouna'
	],
	Atlantique: [
		'Abomey-Calavi',
		'Allada',
		'Kpomassè',
		'Ouidah',
		'Sô-Ava',
		'Toffo',
		'Tori-Bossito',
		'Zè'
	],
	Borgou: ['Bembéréké', 'Kalalé', "N'Dali", 'Nikki', 'Parakou', 'Pèrèrè', 'Sinendé', 'Tchaourou'],
	Collines: ['Bantè', 'Dassa-Zoumè', 'Glazoué', 'Ouèssè', 'Savalou', 'Savè'],
	Couffo: ['Aplahoué', 'Djakotomey', 'Dogbo', 'Klouékanmè', 'Lalo', 'Toviklin'],
	Donga: ['Bassila', 'Copargo', 'Djougou', 'Ouaké'],
	Littoral: ['Cotonou'],
	Mono: ['Athiémé', 'Bopa', 'Comè', 'Grand-Popo', 'Houéyogbé', 'Lokossa'],
	Ouémé: [
		'Adjarra',
		'Adjohoun',
		'Aguégués',
		'Akpro-Missérété',
		'Avrankou',
		'Bonou',
		'Dangbo',
		'Porto-Novo',
		'Sèmè-Kpodji'
	],
	Plateau: ['Adja-Ouèrè', 'Ifangni', 'Kétou', 'Pobè', 'Sakété'],
	Zou: [
		'Abomey',
		'Agbangnizoun',
		'Bohicon',
		'Covè',
		'Djidja',
		'Ouinhi',
		'Zagnanado',
		'Za-Kpota',
		'Zogbodomey'
	]
};
