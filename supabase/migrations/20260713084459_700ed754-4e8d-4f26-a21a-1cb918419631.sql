UPDATE public.menu_layouts
SET layout = REPLACE(layout::text, 'dashboard-kaprog', 'dashboard-kakonli')::jsonb,
    updated_at = now()
WHERE layout::text LIKE '%dashboard-kaprog%';