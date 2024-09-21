import * as Accordion from '@radix-ui/react-accordion';

import type { ExperienceCollection } from '../content/config';
import '../styles/experience.css';

export interface ExperienceProps {
  allExperience: ExperienceCollection;
  workExperience: ExperienceCollection;
  projectExperience: ExperienceCollection;
}

const Experience: React.FC<ExperienceProps> = ({ allExperience, workExperience, projectExperience }) => {
  console.log('allExperience', allExperience);
  console.log('workExperience', workExperience);
  console.log('projectExperience', projectExperience);
  return (
    <Accordion.Root className="width-screen flex flex-column gap-4" type="single" collapsible>
      <Accordion.Item className="" value="expedia">
        <Accordion.Header>
          <Accordion.Trigger className="flex flex-row justify-between width-screen">
            <span>Software Engineer @ Expedia </span>
            <span>2023 - Now</span>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content>
          <p>Enter experience here</p>
        </Accordion.Content>
      </Accordion.Item>

      <Accordion.Item value="twitter">
        <Accordion.Header>
          <Accordion.Trigger>
            <span>Twitter</span>
            <span>Software Engineer</span>
            <span>2022</span>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content>
          <p>Enter experience here</p>
        </Accordion.Content>
      </Accordion.Item>

      <Accordion.Item value="solesavy">
        <Accordion.Header>
          <Accordion.Trigger>
            <span>SoleSavy</span>
            <span>Software Engineer</span>
            <span>2021 - 2022</span>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content>
          <p>Enter experience here</p>
        </Accordion.Content>
      </Accordion.Item>

      <Accordion.Item value="ibm">
        <Accordion.Header>
          <Accordion.Trigger>
            <span>IBM</span>
            <span>Software Engineer</span>
            <span>2020 - 2021</span>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content>
          <p>Enter experience here</p>
        </Accordion.Content>
      </Accordion.Item>

      <Accordion.Item value="trs">
        <Accordion.Header>
          <Accordion.Trigger>
            <span>Teacher Retirement System of Texas</span>
            <span>Software Engineer</span>
            <span>2017 - 2020</span>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content>
          <p>Enter experience here</p>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
};

export default Experience;
