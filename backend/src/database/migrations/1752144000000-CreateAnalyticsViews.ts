import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAnalyticsViews1752144000000 implements MigrationInterface {
    name = 'CreateAnalyticsViews1752144000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // View for total revenue and average order value
        await queryRunner.query(`
            CREATE OR REPLACE VIEW analytics_total_revenue_view AS
            SELECT
                SUM(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE 0 END) AS "totalRevenue",
                AVG(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE NULL END) AS "averageOrderValue"
            FROM pickup pickup
            LEFT JOIN invoice invoice ON pickup.invoice_id = invoice.invoice_id
            WHERE invoice.paid = true;
        `);

        // View for total pickups
        await queryRunner.query(`
            CREATE OR REPLACE VIEW analytics_total_pickups_view AS
            SELECT
                COUNT(pickup_id) AS "totalPickups"
            FROM pickup;
        `);

        // View for company performance
        await queryRunner.query(`
            CREATE OR REPLACE VIEW analytics_company_performance_view AS
            SELECT
                company.company_id AS "companyId",
                company.company_name AS "companyName",
                COALESCE(SUM(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE 0 END), 0) AS "totalRevenue",
                COUNT(pickup.pickup_id) AS "totalPickups",
                COALESCE(AVG(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE NULL END), 0) AS "averageOrderValue",
                MIN(pickup.order_date) AS "firstPickupDate",
                MAX(pickup.order_date) AS "lastPickupDate"
            FROM company company
            LEFT JOIN pickup pickup ON company.company_id = pickup.company_id
            LEFT JOIN invoice invoice ON pickup.invoice_id = invoice.invoice_id
            GROUP BY company.company_id, company.company_name;
        `);

        // View for revenue trends
        await queryRunner.query(`
            CREATE OR REPLACE VIEW analytics_revenue_trends_view AS
            SELECT
                TO_CHAR(pickup.order_date, 'YYYY-MM-DD') AS "periodDay",
                TO_CHAR(pickup.order_date, 'YYYY-"W"WW') AS "periodWeek",
                TO_CHAR(pickup.order_date, 'YYYY-MM') AS "periodMonth",
                TO_CHAR(pickup.order_date, 'YYYY-"Q"Q') AS "periodQuarter",
                TO_CHAR(pickup.order_date, 'YYYY') AS "periodYear",
                SUM(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE 0 END) AS "revenue",
                COUNT(pickup.pickup_id) AS "pickupCount",
                AVG(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE NULL END) AS "averageOrderValue"
            FROM pickup pickup
            LEFT JOIN invoice invoice ON pickup.invoice_id = invoice.invoice_id
            GROUP BY
                TO_CHAR(pickup.order_date, 'YYYY-MM-DD'),
                TO_CHAR(pickup.order_date, 'YYYY-"W"WW'),
                TO_CHAR(pickup.order_date, 'YYYY-MM'),
                TO_CHAR(pickup.order_date, 'YYYY-"Q"Q'),
                TO_CHAR(pickup.order_date, 'YYYY')
            ORDER BY "periodDay" ASC;
        `);

        // View for status distribution
        await queryRunner.query(`
            CREATE OR REPLACE VIEW analytics_status_distribution_view AS
            SELECT
                status.pickup_status_id AS "statusId",
                status.status_name AS "statusName",
                COUNT(pickup.pickup_id) AS "count"
            FROM pickup pickup
            LEFT JOIN pickup_status status ON pickup.pickup_status_id = status.pickup_status_id
            GROUP BY status.pickup_status_id, status.status_name;
        `);

        // View for daily volume
        await queryRunner.query(`
            CREATE OR REPLACE VIEW analytics_daily_volume_view AS
            SELECT
                pickup.order_date::date AS "date",
                COUNT(pickup.pickup_id) AS "pickupCount",
                COALESCE(SUM(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE 0 END), 0) AS "revenue",
                COALESCE(AVG(CASE WHEN invoice.paid = true THEN invoice.total_amount ELSE NULL END), 0) AS "averageOrderValue"
            FROM pickup pickup
            LEFT JOIN invoice invoice ON pickup.invoice_id = invoice.invoice_id
            GROUP BY pickup.order_date::date
            ORDER BY pickup.order_date::date ASC;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP VIEW analytics_daily_volume_view;`);
        await queryRunner.query(`DROP VIEW analytics_status_distribution_view;`);
        await queryRunner.query(`DROP VIEW analytics_revenue_trends_view;`);
        await queryRunner.query(`DROP VIEW analytics_company_performance_view;`);
        await queryRunner.query(`DROP VIEW analytics_total_pickups_view;`);
        await queryRunner.query(`DROP VIEW analytics_total_revenue_view;`);
    }
}
