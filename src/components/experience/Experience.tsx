import * as Accordion from '@radix-ui/react-accordion';

import type { ExperienceCollection, ExperienceCollectionEntry } from '../../content/config';
import '../../styles/action-trigger.css';
import './experience.css';

export interface ExperienceProps {
  allExperience: ExperienceCollection;
  workExperience: ExperienceCollection;
  projectExperience: ExperienceCollection;
}

const Experience: React.FC<ExperienceProps> = ({ allExperience, workExperience, projectExperience }) => {
  return (
    <section id="experience" className="p-block-2 width-100">
      <h2>Experience</h2>
      <Accordion.Root className="flex flex-column gap-4 experience-accordion" type="single" collapsible>
        {allExperience.map((experience: ExperienceCollectionEntry, i: number) => (
          <Accordion.Item key={i} value={experience.data.company} className="flex flex-column gap-2 accordion-item">
            <Accordion.Header>
              <Accordion.Trigger asChild>
                <div className="flex flex-jc-space-between flex-ai-stretch experience-accordion__trigger">
                  <span>
                    {experience.data.position} @ {experience.data.company}
                  </span>
                  <span>
                    {experience.data.startDate.toLocaleDateString('en-US', { year: 'numeric' })} -{' '}
                    {experience.data.endDate
                      ? experience.data.endDate.toLocaleDateString('en-US', { year: 'numeric' })
                      : ''}
                  </span>
                </div>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="accordion-content">
              <p className="mb-2">{experience.data.description}</p>
              <div className="flex flex-wrap gap-2">
                {experience.data.tags?.map((tag, i) => (
                  <span key={i} className="action-trigger">
                    #{tag}
                  </span>
                ))}
              </div>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </section>
  );
};

export default Experience;
