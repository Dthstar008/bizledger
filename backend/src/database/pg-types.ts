import { defaults, types } from 'pg';

// `timestamp` (without time zone) columns are filled by the database's now(),
// which runs in UTC. node-postgres would otherwise read them, and write Date
// parameters compared against them, in the server process's local time, so the
// same row was an hour off on a Lagos machine and correct on the UTC host.
// Pin both directions to UTC so behaviour doesn't depend on the host's TZ.
const TIMESTAMP_WITHOUT_TZ = 1114;
types.setTypeParser(TIMESTAMP_WITHOUT_TZ, (value: string) => new Date(`${value.replace(' ', 'T')}Z`));
defaults.parseInputDatesAsUTC = true;
