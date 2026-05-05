import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const getDayClass = (day) => {
  const dayMap = {
    'Lunes': 'lunes',
    'Martes': 'martes',
    'Miércoles': 'miercoles',
    'Jueves': 'jueves',
    'Viernes': 'viernes',
    'Sábado': 'sabado',
    'Domingo': 'domingo'
  };
  return dayMap[day] || '';
};

export const getRouteClass = (routeId) => {
  const routeMap = {
    'ruta-1': 'michel',
    'ruta-2': 'angie'
  };
  return routeMap[routeId] || '';
};

export const getVendorClass = (vendor) => {
  const vendorMap = {
    'Michel': 'michel',
    'Angie': 'angie',
    'Julian': 'julian'
  };
  return vendorMap[vendor] || '';
};
