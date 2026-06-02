import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { StatusBadge } from './StatusBadge';
import type { PetStatus } from './StatusBadge';
import { Button } from './ui/button';

interface PetCardProps {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number; // in months
  status: PetStatus;
  photoUrl?: string;
  onAction?: (id: string) => void;
}

export function PetCard({ id, name, species, breed, age, status, photoUrl, onAction }: PetCardProps) {
  const ageDisplay = age >= 12 
    ? `${Math.floor(age / 12)} año${Math.floor(age / 12) > 1 ? 's' : ''}` 
    : `${age} mes${age > 1 ? 'es' : ''}`;

  return (
    <Card className="overflow-hidden border-gray-200 transition-all hover:shadow-md">
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {photoUrl ? (
          <img src={photoUrl} alt={name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-rescue-50/50">
            Sin foto
          </div>
        )}
        <div className="absolute top-3 right-3">
          <StatusBadge status={status} />
        </div>
      </div>
      
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg text-gray-900">{name}</h3>
            <p className="text-sm text-gray-500">{species} • {breed}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-gray-600">Edad est.: {ageDisplay}</p>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Button 
          variant={status === 'AVAILABLE' ? 'default' : 'secondary'} 
          className="w-full"
          onClick={() => onAction && onAction(id)}
        >
          Ver Detalles
        </Button>
      </CardFooter>
    </Card>
  );
}
