export const ArticleSchema = {
	type: 'article',
	legacy: true,
	identity: {
		kind: '@id',
		name: 'id',
	},
	fields: [
		{
			kind: 'attribute',
			name: 'title',
			type: 'string',
		},
		{
			kind: 'belongsTo',
			name: 'author',
			type: 'user',
		},
		{
			kind: 'hasMany',
			name: 'comments',
			type: 'comment',
		},
	],
};