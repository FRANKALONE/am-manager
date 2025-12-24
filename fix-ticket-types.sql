-- Fix ticket type values to match Jira issue types exactly
DELETE FROM Parameter WHERE category = 'VALID_TICKET_TYPE';

INSERT INTO Parameter (category, label, value) VALUES 
('VALID_TICKET_TYPE', 'Consulta', 'Consulta'),
('VALID_TICKET_TYPE', 'Incidencia de Correctivo', 'Incidencia de Correctivo'),
('VALID_TICKET_TYPE', 'Solicitud de servicio', 'Solicitud de servicio');
