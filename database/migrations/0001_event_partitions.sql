-- init.sql created partitions covering only 2026-02-01 .. 2026-04-01, so every
-- INSERT INTO content_events outside that window failed with
-- "no partition of relation content_events found for row".
-- The trigger therefore never fired and view/like/share counts stayed at 0,
-- which silently emptied every trending, popular and leaderboard query.

-- Safety net: anything with no matching range partition lands here instead of
-- raising. This is what stops the bug from returning as time passes.
CREATE TABLE IF NOT EXISTS content_events_default PARTITION OF content_events DEFAULT;

-- Helper so future months get real partitions rather than piling into DEFAULT.
CREATE OR REPLACE FUNCTION create_month_partition(target DATE)
RETURNS void AS $$
DECLARE
    start_date DATE := date_trunc('month', target)::date;
    end_date   DATE := (date_trunc('month', target) + INTERVAL '1 month')::date;
    part_name  TEXT := 'content_events_' || to_char(start_date, 'YYYY_MM');
BEGIN
    IF to_regclass(part_name) IS NOT NULL THEN
        RETURN;
    END IF;
    EXECUTE format(
        'CREATE TABLE %I PARTITION OF content_events FOR VALUES FROM (%L) TO (%L)',
        part_name, start_date, end_date
    );
END;
$$ LANGUAGE plpgsql;
