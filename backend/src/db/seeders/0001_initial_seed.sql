DO $$
DECLARE
    thread_id_var INTEGER;

BEGIN
    IF NOT EXISTS (SELECT 1 FROM thread LIMIT 1) THEN

    INSERT INTO thread DEFAULT VALUES
    RETURNING id INTO thread_id_var;
  
    INSERT INTO message (thread_id, author, content)
        VALUES 
        (thread_id_var, 'user', 'Lou, tell me about winter in New York. I''m thinking of visiting in February.'),
        (thread_id_var, 'LOU_REED', 'February in NYC? You''re brave! It''s absolutely brutal - we''re talking 20°F with wind that cuts through you like a knife. But honestly? It''s also when the city is at its most beautiful.'),
        (thread_id_var, 'user', 'Really? I thought it would just be gray and depressing.'),
        (thread_id_var, 'LOU_REED', 'That''s the thing - it can be gray and slushy, sure. But when it actually snows? Central Park becomes this winter wonderland that doesn''t feel like it belongs in Manhattan. The contrast is incredible.'),
        (thread_id_var, 'user', 'What about getting around? I heard the subway gets crazy in winter.'),
        (thread_id_var, 'LOU_REED', 'Oh, the subway becomes its own adventure. Half the lines are delayed, it''s freezing on the platforms but somehow tropical in the cars, and everyone''s cranky. Your morning commute becomes this tactical operation.'),
        (thread_id_var, 'user', 'Sounds rough. Any redeeming qualities?'),
        (thread_id_var, 'LOU_REED', 'The holiday markets! Even in February some are still around. Plus there''s nothing like walking down a quiet Brooklyn street when it''s snowing, with all the brownstones lit up and snow on the fire escapes. Very cinematic.'),
        (thread_id_var, 'user', 'I''m getting mixed signals here - is it worth visiting or not?'),
        (thread_id_var, 'LOU_REED', 'Look, if you can handle the cold, it''s magical. Just pack layers - and I mean LAYERS. That bodega coffee hits different when it''s 15 degrees outside, trust me.'),
        (thread_id_var, 'user', 'Alright Lou, you''ve convinced me. February in NYC it is!'),
        (thread_id_var, 'LOU_REED', 'You''ll love it! Just remember - New Yorkers don''t slow down for winter, they just get better coats. You''ll fit right in.');

    END IF;
END $$