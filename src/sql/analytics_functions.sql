-- Analytics functions for dashboard visualizations

-- Function to get enrollment trends (farmer and organization registrations over time)
CREATE OR REPLACE FUNCTION get_enrollment_trends(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date TEXT,
  farmers BIGINT,
  organizations BIGINT
) 
SECURITY DEFINER -- Add security definer to bypass RLS
AS $$
BEGIN
  RETURN QUERY
  WITH dates AS (
    SELECT 
      to_char(date_trunc('month', d), 'Mon YYYY') AS month_label,
      date_trunc('month', d) AS month_date
    FROM generate_series(
      p_start_date::timestamp, 
      p_end_date::timestamp, 
      '1 month'::interval
    ) d
  ),
  farmer_counts AS (
    SELECT 
      to_char(date_trunc('month', created_at), 'Mon YYYY') AS month_label,
      COUNT(*) AS farmer_count
    FROM users
    WHERE role = 'farmer'
      AND created_at BETWEEN p_start_date AND p_end_date
    GROUP BY month_label
  ),
  org_counts AS (
    SELECT 
      to_char(date_trunc('month', created_at), 'Mon YYYY') AS month_label,
      COUNT(*) AS org_count
    FROM organizations
    WHERE created_at BETWEEN p_start_date AND p_end_date
    GROUP BY month_label
  )
  SELECT 
    d.month_label AS date,
    COALESCE(f.farmer_count, 0) AS farmers,
    COALESCE(o.org_count, 0) AS organizations
  FROM dates d
  LEFT JOIN farmer_counts f ON d.month_label = f.month_label
  LEFT JOIN org_counts o ON d.month_label = o.month_label
  ORDER BY d.month_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get metrics for each region
CREATE OR REPLACE FUNCTION get_regional_metrics()
RETURNS TABLE (
  region TEXT,
  farmers BIGINT,
  organizations BIGINT,
  budgetUtilization NUMERIC
) 
SECURITY DEFINER -- Add security definer to bypass RLS
AS $$
BEGIN
  RETURN QUERY
  WITH region_farmers AS (
    SELECT 
      r.name AS region_name,
      COUNT(u.id) AS farmer_count
    FROM regions r
    LEFT JOIN users u ON u.region_id = r.id AND u.role = 'farmer'
    GROUP BY r.name
  ),
  region_orgs AS (
    SELECT 
      r.name AS region_name,
      COUNT(o.id) AS org_count
    FROM regions r
    LEFT JOIN organizations o ON o.region_id = r.id
    GROUP BY r.name
  ),
  region_budget AS (
    SELECT 
      r.name AS region_name,
      CASE 
        WHEN SUM(ba.amount) = 0 THEN 0
        ELSE ROUND((SUM(bu.amount) / SUM(ba.amount)) * 100, 1)
      END AS budget_utilization
    FROM regions r
    LEFT JOIN budget_allocations ba ON ba.region_id = r.id AND ba.fiscal_year = EXTRACT(YEAR FROM CURRENT_DATE)
    LEFT JOIN budget_utilization bu ON bu.allocation_id = ba.id
    GROUP BY r.name
  )
  SELECT 
    rf.region_name AS region,
    rf.farmer_count AS farmers,
    ro.org_count AS organizations,
    rb.budget_utilization AS budgetutilization
  FROM region_farmers rf
  JOIN region_orgs ro ON rf.region_name = ro.region_name
  JOIN region_budget rb ON rf.region_name = rb.region_name
  ORDER BY rf.region_name;
END;
$$ LANGUAGE plpgsql;

-- Function to get crop distribution among farmers
CREATE OR REPLACE FUNCTION get_crop_distribution()
RETURNS TABLE (
  category TEXT,
  value BIGINT
) 
SECURITY DEFINER -- Add security definer to bypass RLS
AS $$
BEGIN
  RETURN QUERY
  WITH crop_counts AS (
    SELECT 
      crop_type,
      COUNT(*) AS farmer_count
    FROM farmer_crops
    GROUP BY crop_type
  ),
  total_count AS (
    SELECT COUNT(*) AS total FROM farmer_crops
  )
  SELECT 
    crop_type AS category,
    farmer_count AS value
  FROM crop_counts
  ORDER BY farmer_count DESC
  LIMIT 6;
END;
$$ LANGUAGE plpgsql;

-- Function to get organization growth by region
CREATE OR REPLACE FUNCTION get_organization_growth_by_region()
RETURNS TABLE (
  category TEXT,
  value NUMERIC
) 
SECURITY DEFINER -- Add security definer to bypass RLS
AS $$
BEGIN
  RETURN QUERY
  WITH org_counts AS (
    SELECT 
      r.name AS region_name,
      COUNT(o.id) AS current_count
    FROM regions r
    LEFT JOIN organizations o ON o.region_id = r.id
    GROUP BY r.name
  ),
  org_growth AS (
    SELECT 
      r.name AS region_name,
      ROUND(
        (COUNT(o.id) * 100.0 / 
          NULLIF((SELECT COUNT(*) FROM organizations 
                  WHERE created_at < (CURRENT_DATE - INTERVAL '3 months')), 0)) - 100, 
        1
      ) AS growth_rate
    FROM regions r
    LEFT JOIN organizations o ON o.region_id = r.id 
      AND o.created_at >= (CURRENT_DATE - INTERVAL '3 months')
    GROUP BY r.name
  )
  SELECT 
    oc.region_name AS category,
    COALESCE(og.growth_rate, 0) AS value
  FROM org_counts oc
  LEFT JOIN org_growth og ON oc.region_name = og.region_name
  WHERE COALESCE(og.growth_rate, 0) > 0
  ORDER BY value DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Function to get user activity metrics
CREATE OR REPLACE FUNCTION get_user_activity_metrics(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date TEXT,
  logins BIGINT,
  actions BIGINT,
  registrations BIGINT
) 
SECURITY DEFINER -- Add security definer to bypass RLS
AS $$
BEGIN
  RETURN QUERY
  WITH dates AS (
    SELECT 
      to_char(date_trunc('month', d), 'Mon YYYY') AS month_label,
      date_trunc('month', d) AS month_date
    FROM generate_series(
      p_start_date::timestamp, 
      p_end_date::timestamp, 
      '1 month'::interval
    ) d
  ),
  login_counts AS (
    SELECT 
      to_char(date_trunc('month', created_at), 'Mon YYYY') AS month_label,
      COUNT(*) AS login_count
    FROM user_activity_logs
    WHERE activity_type = 'login'
      AND created_at BETWEEN p_start_date AND p_end_date
    GROUP BY month_label
  ),
  action_counts AS (
    SELECT 
      to_char(date_trunc('month', created_at), 'Mon YYYY') AS month_label,
      COUNT(*) AS action_count
    FROM user_activity_logs
    WHERE activity_type != 'login'
      AND created_at BETWEEN p_start_date AND p_end_date
    GROUP BY month_label
  ),
  registration_counts AS (
    SELECT 
      to_char(date_trunc('month', created_at), 'Mon YYYY') AS month_label,
      COUNT(*) AS reg_count
    FROM users
    WHERE created_at BETWEEN p_start_date AND p_end_date
    GROUP BY month_label
  )
  SELECT 
    d.month_label AS date,
    COALESCE(l.login_count, 0) AS logins,
    COALESCE(a.action_count, 0) AS actions,
    COALESCE(r.reg_count, 0) AS registrations
  FROM dates d
  LEFT JOIN login_counts l ON d.month_label = l.month_label
  LEFT JOIN action_counts a ON d.month_label = a.month_label
  LEFT JOIN registration_counts r ON d.month_label = r.month_label
  ORDER BY d.month_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get approval rates for different request types
CREATE OR REPLACE FUNCTION get_approval_rates()
RETURNS TABLE (
  category TEXT,
  value NUMERIC
) 
SECURITY DEFINER -- Add security definer to bypass RLS
AS $$
BEGIN
  RETURN QUERY
  WITH request_types AS (
    SELECT 'Organization Registration' AS request_type UNION
    SELECT 'Budget Requests' UNION
    SELECT 'Farmer Applications' UNION
    SELECT 'Resource Requests'
  ),
  org_approval AS (
    SELECT
      'Organization Registration' AS request_type,
      ROUND((COUNT(CASE WHEN status = 'approved' THEN 1 END) * 100.0 / 
             NULLIF(COUNT(*), 0)), 1) AS approval_rate
    FROM organization_applications
  ),
  budget_approval AS (
    SELECT
      'Budget Requests' AS request_type,
      ROUND((COUNT(CASE WHEN status = 'approved' THEN 1 END) * 100.0 / 
             NULLIF(COUNT(*), 0)), 1) AS approval_rate
    FROM budget_requests
  ),
  farmer_approval AS (
    SELECT
      'Farmer Applications' AS request_type,
      ROUND((COUNT(CASE WHEN status = 'approved' THEN 1 END) * 100.0 / 
             NULLIF(COUNT(*), 0)), 1) AS approval_rate
    FROM farmer_applications
  ),
  resource_approval AS (
    SELECT
      'Resource Requests' AS request_type,
      ROUND((COUNT(CASE WHEN status = 'approved' THEN 1 END) * 100.0 / 
             NULLIF(COUNT(*), 0)), 1) AS approval_rate
    FROM resource_requests
  )
  SELECT
    rt.request_type AS category,
    COALESCE(
      CASE rt.request_type
        WHEN 'Organization Registration' THEN (SELECT approval_rate FROM org_approval)
        WHEN 'Budget Requests' THEN (SELECT approval_rate FROM budget_approval)
        WHEN 'Farmer Applications' THEN (SELECT approval_rate FROM farmer_approval)
        WHEN 'Resource Requests' THEN (SELECT approval_rate FROM resource_approval)
      END,
      0
    ) AS value
  FROM request_types rt;
END;
$$ LANGUAGE plpgsql;

-- Function to get annual budget utilization by month
CREATE OR REPLACE FUNCTION get_budget_utilization_by_month(
  p_fiscal_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE (
  month TEXT,
  amount NUMERIC
) 
SECURITY DEFINER -- Add security definer to bypass RLS
AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT 
      generate_series(1, 12) AS month_num,
      to_char(to_date(generate_series(1, 12)::text, 'MM'), 'Mon') AS month_name
  )
  SELECT 
    m.month_name AS month,
    COALESCE(SUM(bu.amount), 0) AS amount
  FROM months m
  LEFT JOIN budget_utilization bu ON 
    EXTRACT(MONTH FROM bu.date) = m.month_num AND
    EXTRACT(YEAR FROM bu.date) = p_fiscal_year
  GROUP BY m.month_num, m.month_name
  ORDER BY m.month_num;
END;
$$ LANGUAGE plpgsql; 