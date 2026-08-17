'use strict';
/* Bootstrap a staff user from the CLI (there is no admin until you make one):
     npm run create-admin -- --email=you@caligoodsinc.com --password=Str0ngPass --firstName=Jane --lastName=Doe [--role=super_admin]
*/
require('../config/env');
const { sequelize, User, Role } = require('../models');
const seedRoles = require('./seedRoles');
const { ROLES, ROLE_LIST } = require('../helpers/constants');

const args = Object.fromEntries(process.argv.slice(2)
  .map((a) => a.replace(/^--/, '').split('='))
  .map(([k, ...v]) => [k, v.join('=')]));

(async () => {
  const { email, password, firstName = 'Admin', lastName = 'User', role = ROLES.SUPER_ADMIN } = args;
  if (!email || !password) { console.error('Usage: --email=.. --password=.. [--firstName=.. --lastName=.. --role=..]'); process.exit(1); }
  if (!ROLE_LIST.includes(role)) { console.error(`Invalid role. One of: ${ROLE_LIST.join(', ')}`); process.exit(1); }

  await sequelize.authenticate();
  await sequelize.sync();
  await seedRoles();

  const roleRow = await Role.findOne({ where: { name: role } });
  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) { console.error(`User ${email} already exists.`); process.exit(1); }

  const user = await User.create({
    firstName, lastName, email, password, roleId: roleRow.id, isActive: true, isEmailVerified: true,
  });
  console.log(`\u2705 Created ${role}: ${user.email} (${user.id})`);
  await sequelize.close();
  process.exit(0);
})().catch((e) => { console.error('\u274c', e.message); process.exit(1); });
