exports.up = async (knex) => {
  await knex.schema.createTable('order_creation_command', (table) => {
    table.increments()
    table.string('command', 250).notNullable()
    table.timestamp('created_at').notNullable()
  })

  await knex.raw(`
    CREATE OR REPLACE FUNCTION notify_update()
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
    CREATE TRIGGER notify_update
    AFTER INSERT
    ON order_creation_command
    FOR EACH ROW
    EXECUTE PROCEDURE notify_update()
  `)
}

exports.down = async (knex) => {
  await knex.raw(
    'DROP TRIGGER IF EXISTS notify_update ON order_creation_command'
  )
  await knex.raw('DROP FUNCTION IF EXISTS notify_update()')
  await knex.schema.dropTableIfExists('order_creation_command')
}
