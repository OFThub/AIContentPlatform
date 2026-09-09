-- contents.comment_count was selected by the API but could never be non-zero:
-- update_content_metrics() handled only view/like/share, and nothing at all
-- watched the comments table.

CREATE OR REPLACE FUNCTION update_content_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type = 'view' THEN
        UPDATE contents SET view_count = view_count + 1 WHERE id = NEW.content_id;
    ELSIF NEW.event_type = 'like' THEN
        UPDATE contents SET like_count = like_count + 1 WHERE id = NEW.content_id;
    ELSIF NEW.event_type = 'share' THEN
        UPDATE contents SET share_count = share_count + 1 WHERE id = NEW.content_id;
    ELSIF NEW.event_type = 'comment' THEN
        UPDATE contents SET comment_count = comment_count + 1 WHERE id = NEW.content_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Counted from the comments table itself so a delete decrements too.
CREATE OR REPLACE FUNCTION sync_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE contents SET comment_count = comment_count + 1 WHERE id = NEW.content_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE contents SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.content_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_comment_count ON comments;
CREATE TRIGGER trigger_sync_comment_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION sync_comment_count();
