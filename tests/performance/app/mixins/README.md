Relationships (mixins and model variants follow the same pattern):

A hasOne  B (1:1)
A hasOne  C (1:many)
A hasOne  D (1:none)

B hasOne  A (1:1)
B hasMany C (many:many)
B hasMany D (many:none)

C hasMany A (many:1)
C hasMany B (many:many)
C hasMany D (many:none)

D hasNone A
D hasNone B
D hasMany C (many:none)
