-- Seed data for Santunan Emas
-- Programmes: English names, spec-defined colours

INSERT INTO public.programmes (name, description, colour, is_default, is_active, sort_order)
VALUES
  ('Kuliah',            'Religious lecture',   '#3B82F6', true,  true, 1),
  ('Sewing',            'Sewing programme',    '#10B981', false, true, 2),
  ('Physical Activity', 'Physical activities', '#F59E0B', false, true, 3)
ON CONFLICT (name) DO NOTHING;
