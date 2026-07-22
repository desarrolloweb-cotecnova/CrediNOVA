import { supabase } from '@/lib/supabase';
import type { CreditStudyCost, AcademicProgram } from '@/types/application';

/**
 * Servicio para gestión de costos de estudio de crédito
 */

export async function getCreditStudyCosts() {
  const { data, error } = await supabase
    .from('credit_study_costs')
    .select('*')
    .order('year', { ascending: false });

  if (error) throw error;
  
  return (data || []).map(item => ({
    id: item.id,
    year: item.year,
    amount: item.amount,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  })) as CreditStudyCost[];
}

export async function getCreditStudyCostByYear(year: number) {
  const { data, error } = await supabase
    .from('credit_study_costs')
    .select('*')
    .eq('year', year)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  
  return {
    id: data.id,
    year: data.year,
    amount: data.amount,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as CreditStudyCost;
}

export async function createCreditStudyCost(year: number, amount: number) {
  const { data, error } = await supabase
    .from('credit_study_costs')
    .insert({
      year,
      amount,
    })
    .select()
    .single();

  if (error) throw error;
  
  return {
    id: data.id,
    year: data.year,
    amount: data.amount,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as CreditStudyCost;
}

export async function updateCreditStudyCost(id: string, amount: number) {
  const { data, error } = await supabase
    .from('credit_study_costs')
    .update({
      amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  
  return {
    id: data.id,
    year: data.year,
    amount: data.amount,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as CreditStudyCost;
}

export async function deleteCreditStudyCost(id: string) {
  const { error } = await supabase
    .from('credit_study_costs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Servicio para gestión de programas académicos
 */

export async function getAcademicPrograms(activeOnly = false) {
  let query = supabase
    .from('academic_programs')
    .select('*')
    .order('name', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  return (data || []).map(item => ({
    id: item.id,
    name: item.name,
    tuitionAmount: item.tuition_amount,
    isActive: item.is_active,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  })) as AcademicProgram[];
}

export async function getAcademicProgramById(id: string) {
  const { data, error } = await supabase
    .from('academic_programs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  
  return {
    id: data.id,
    name: data.name,
    tuitionAmount: data.tuition_amount,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as AcademicProgram;
}

export async function createAcademicProgram(name: string, tuitionAmount: number, isActive = true) {
  const { data, error } = await supabase
    .from('academic_programs')
    .insert({
      name,
      tuition_amount: tuitionAmount,
      is_active: isActive,
    })
    .select()
    .single();

  if (error) throw error;
  
  return {
    id: data.id,
    name: data.name,
    tuitionAmount: data.tuition_amount,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as AcademicProgram;
}

export async function updateAcademicProgram(id: string, updates: { name?: string; tuitionAmount?: number; isActive?: boolean }) {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.tuitionAmount !== undefined) updateData.tuition_amount = updates.tuitionAmount;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

  const { data, error } = await supabase
    .from('academic_programs')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  
  return {
    id: data.id,
    name: data.name,
    tuitionAmount: data.tuition_amount,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as AcademicProgram;
}

export async function deleteAcademicProgram(id: string) {
  const { error } = await supabase
    .from('academic_programs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
