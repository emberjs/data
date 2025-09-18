export const AuditableTrait = {
	type: 'auditable',
	legacy: true,
	fields: [
		{
			kind: 'attribute',
			name: 'createdAt',
			type: 'date',
		},
		{
			kind: 'attribute',
			name: 'updatedAt',
			type: 'date',
		},
		{
			kind: 'belongsTo',
			name: 'createdBy',
			type: 'user',
			options: {
				async: false,
				inverse: null,
			},
		},
		{
			kind: 'belongsTo',
			name: 'updatedBy',
			type: 'user',
			options: {
				async: false,
				inverse: null,
			},
		},
	],
};