const TABLE_NAME = 'salesforce.order_creation_command'

exports.up = async (knex) => {
  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.increments()
    table.string('command', 250).notNullable()
    table.timestamp('created_at').notNullable()
  })

  await knex.raw(`
    CREATE OR REPLACE FUNCTION notify_command()
      RETURNS trigger AS
    $BODY$
      BEGIN
        PERFORM pg_notify('command_update', row_to_json(NEW)::text);
        RETURN NULL;
      END;
    $BODY$
      LANGUAGE plpgsql VOLATILE
      COST 100;
   `)

  await knex.raw(`
    CREATE TRIGGER notify_command
    AFTER INSERT
    ON ${TABLE_NAME}
    FOR EACH ROW
    EXECUTE PROCEDURE notify_command()
  `)
}

exports.down = async (knex) => {
  await knex.raw(`DROP TRIGGER IF EXISTS notify_command ON ${TABLE_NAME}`)
  await knex.raw('DROP FUNCTION IF EXISTS notify_command()')
  await knex.schema.dropTableIfExists(TABLE_NAME)
}
