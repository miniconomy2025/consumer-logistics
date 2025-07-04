import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TopCompaniesProps {
  companies?: Array<{
    companyId: string | number;
    companyName: string;
    totalPickups: number;
    totalRevenue: number;
  }>;
}

export function TopCompanies({ companies }: TopCompaniesProps) {
  // Fix: Check if companies is an array before mapping
  if (!companies || !Array.isArray(companies) || companies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Companies</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No company data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Companies</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {companies.map((company) => (
            <div key={company.companyId} className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">{company.companyName}</p>
                <p className="text-sm text-muted-foreground">
                  {company.totalPickups} pickups
                </p>
              </div>
              <div className="font-medium">
                {new Intl.NumberFormat('en-ZA', { 
                  style: 'currency', 
                  currency: 'ZAR' 
                }).format(company.totalRevenue || 0)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}